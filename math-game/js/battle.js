// Find Friends — Mario-style side-scrolling platformer
class BattleGameClass {
    constructor() {
        this.GRAVITY      = 880;
        this.PLAYER_SPEED = 200;
        this.JUMP_VEL     = -440;
        this.TOTAL_Q      = 3;
        this.GH           = 42;   // ground height

        this.canvas = null; this.ctx = null;
        this.animFrame = null; this.isRunning = false;
        this.lastTime = 0; this.W = 0; this.H = 0;

        this.lives = 3; this.questionsCompleted = 0; this.currentQ = 0;
        this.grade = '1'; this.timerTotal = 0; this.timerRemaining = 0;
        this.timerInterval = null; this.gameOver = false;

        this.player     = null;
        this.platforms  = [];
        this.enemies    = [];
        this.shrapnel   = [];
        this.particles  = [];
        this.scrollX    = 0;
        this.levelEndX  = 0;

        this.questions  = [];
        this.controls   = { left:false, right:false, jump:false };
        this.jumpConsumed = false;

        this.avatarImg    = null;
        this.avatarLoaded = false;
        this.savedFriends = []; // collected friend avatar images for HUD
        this.COLORS = ['#ff6b6b','#ff9f43','#26de81','#45aaf2','#fd79a8','#a29bfe','#00cec9','#e17055'];
    }

    // ── INIT ──────────────────────────────────────────────────────────────────

    async init() {
        this.canvas = document.getElementById('battle-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.setupControls();
        window.addEventListener('resize', () => { if (this.isRunning) this.resizeCanvas(); });
        screen.orientation?.addEventListener('change', () => { if (this.isRunning) setTimeout(() => this.resizeCanvas(), 200); });
    }

    async loadAvatar() {
        this.avatarLoaded = false; this.avatarImg = null;
        if (typeof AvatarManager === 'undefined') return;
        try {
            const svg  = AvatarManager.getSVG(80, false);
            const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url  = URL.createObjectURL(blob);
            await new Promise(resolve => {
                const img = new Image();
                img.onload  = () => { this.avatarImg = img; this.avatarLoaded = true; URL.revokeObjectURL(url); resolve(); };
                img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
                img.src = url;
            });
        } catch(e) {}
    }

    loadRandomAvatarForEnemy(enemy) {
        if (typeof AvatarManager === 'undefined') return;
        const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
        const saved = { ...AvatarManager.current };
        AvatarManager.current = {
            faceForm: rnd(AvatarManager.parts.faceForm),
            faceColor: rnd(AvatarManager.colors.face),
            eyesForm: rnd(['angry','cool','surprised','normal','wink']),
            eyesColor: rnd(AvatarManager.colors.eyes),
            hairType: rnd(AvatarManager.parts.hairType),
            hairColor: rnd(AvatarManager.colors.hair),
            noseType: rnd(AvatarManager.parts.noseType),
            lipsType: rnd(['normal','wide','vampire','duck-face','smile']),
            accessory: rnd(AvatarManager.parts.accessory),
            outfit: rnd(AvatarManager.parts.outfit),
            outfitColor: rnd(AvatarManager.colors.outfit),
        };
        const svg = AvatarManager.getSVG(80, false);
        AvatarManager.current = saved;
        try {
            const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url  = URL.createObjectURL(blob);
            const img  = new Image();
            img.onload  = () => { enemy.avatarImg = img; URL.revokeObjectURL(url); };
            img.onerror = () => { URL.revokeObjectURL(url); };
            img.src = url;
        } catch(e) {}
    }

    setupControls() {
        const map = { left:'battle-left-btn', right:'battle-right-btn', jump:'battle-jump-btn' };
        for (const [key, id] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (!el) continue;
            ['touchstart','mousedown'].forEach(ev =>
                el.addEventListener(ev, e => { e.preventDefault(); this.controls[key] = true; }, { passive:false })
            );
            ['touchend','touchcancel','mouseup'].forEach(ev =>
                el.addEventListener(ev, () => { this.controls[key] = false; })
            );
        }
        document.addEventListener('keydown', e => {
            if (e.key==='ArrowLeft'||e.key==='a') this.controls.left = true;
            if (e.key==='ArrowRight'||e.key==='d') this.controls.right = true;
            if ((e.key==='ArrowUp'||e.key==='w'||e.key===' ')&&!e.repeat) this.controls.jump = true;
        });
        document.addEventListener('keyup', e => {
            if (e.key==='ArrowLeft'||e.key==='a') this.controls.left = false;
            if (e.key==='ArrowRight'||e.key==='d') this.controls.right = false;
            if (e.key==='ArrowUp'||e.key==='w'||e.key===' ') this.controls.jump = false;
        });
    }

    // ── CANVAS ────────────────────────────────────────────────────────────────

    resizeCanvas() {
        const screen = document.getElementById('battle-screen');
        const hdr  = document.getElementById('battle-header');
        const ctrl = document.getElementById('battle-controls');
        if (!screen) return;
        const W = screen.clientWidth;
        const H = screen.clientHeight - (hdr ? hdr.offsetHeight : 0) - (ctrl ? ctrl.offsetHeight : 0);
        this.canvas.width = W;
        this.canvas.height = Math.max(100, H);
        this.W = this.canvas.width;
        this.H = this.canvas.height;
    }

    // ── QUESTIONS ─────────────────────────────────────────────────────────────

    makeQuestion() {
        const g = parseInt(this.grade);
        const ri = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
        let text, answer;
        if (g===1) { const a=ri(1,9),b=ri(1,9); text=`${a} + ${b}`; answer=a+b; }
        else if (g===2) {
            if (Math.random()<0.5) { const a=ri(5,15),b=ri(1,10); text=`${a} + ${b}`; answer=a+b; }
            else { const a=ri(8,20),b=ri(1,a-1); text=`${a} − ${b}`; answer=a-b; }
        } else if (g===3) { const a=ri(2,10),b=ri(2,10); text=`${a} × ${b}`; answer=a*b; }
        else if (g===4) {
            const t=ri(0,2);
            if (t===0){const a=ri(20,80),b=ri(10,50);text=`${a} + ${b}`;answer=a+b;}
            else if(t===1){const a=ri(30,100),b=ri(5,25);text=`${a} − ${b}`;answer=a-b;}
            else{const a=ri(3,12),b=ri(3,12);text=`${a} × ${b}`;answer=a*b;}
        } else { const a=ri(4,15),b=ri(4,15); text=`${a} × ${b}`; answer=a*b; }
        return { text, answer, wrongs: this.makeWrongs(answer, 6) };
    }

    makeWrongs(correct, n) {
        const set = new Set();
        const spread = Math.max(5, Math.ceil(Math.abs(correct)*0.28));
        let tries = 0;
        while (set.size < n && tries++ < 400) {
            const d = Math.floor(Math.random()*spread*2)-spread;
            if (d!==0) { const w=correct+d; if (w>0&&w!==correct) set.add(w); }
        }
        return [...set];
    }

    randomWrongAnswer() {
        const q = this.questions[this.currentQ];
        return q.wrongs[Math.floor(Math.random() * q.wrongs.length)];
    }

    // ── LEVEL GENERATION ──────────────────────────────────────────────────────

    generateTerrain(fromX, toX) {
        const GY = this.H - this.GH;
        let x = fromX;

        while (x < toX) {
            const segLen = 180 + Math.random() * 280;

            // Ground segment
            this.platforms.push({ x, y: GY, w: segLen, h: this.GH, isGround: true });

            // Maybe floating platform above
            if (Math.random() < 0.45) {
                const pw = 80 + Math.random() * 80;
                const px = x + 30 + Math.random() * (segLen - pw - 20);
                const py = GY - 80 - Math.random() * 80;
                this.platforms.push({ x: px, y: py, w: pw, h: 14, isGround: false });
            }

            x += segLen;

            // Gap? (not at the very start)
            if (x > fromX + 350 && Math.random() < 0.45) {
                const gapLen = 55 + Math.random() * 55;

                // Sometimes add a stepping stone
                if (Math.random() < 0.5) {
                    this.platforms.push({
                        x: x + gapLen/2 - 30, y: GY - 35 - Math.random()*30,
                        w: 60 + Math.random()*30, h: 14, isGround: false
                    });
                }
                x += gapLen;
            }
        }
        return x;
    }

    spawnEnemiesInRange(fromX, toX) {
        const q = this.questions[this.currentQ];
        if (!q) return;
        let x = fromX + 120 + Math.random() * 100;
        let correctPlaced = false;

        while (x < toX - 50) {
            const surface = this.findSurfaceAt(x);
            if (surface) {
                // ~25% correct, but ensure at least one per batch
                const makeCorrect = !correctPlaced && (x > toX - 300 || Math.random() < 0.25);
                const answer = makeCorrect ? q.answer : this.randomWrongAnswer();
                const sp = { x, y: surface.y };
                this.enemies.push(this.createEnemy(sp, answer, makeCorrect));
                if (makeCorrect) correctPlaced = true;
            }
            x += 160 + Math.random() * 220;
        }

        // Guarantee at least one correct enemy if none placed
        if (!correctPlaced) {
            const bx = fromX + 200 + Math.random() * (toX - fromX - 400);
            const surface = this.findSurfaceAt(bx) || { y: this.H - this.GH };
            this.enemies.push(this.createEnemy({ x: bx, y: surface.y }, q.answer, true));
        }
    }

    findSurfaceAt(worldX) {
        for (const p of this.platforms) {
            if (worldX >= p.x && worldX <= p.x + p.w) return { y: p.y };
        }
        return null;
    }

    extendLevel() {
        const aheadNeeded = this.scrollX + this.W * 3;
        if (this.levelEndX < aheadNeeded) {
            const oldEnd = this.levelEndX;
            this.levelEndX = this.generateTerrain(this.levelEndX, aheadNeeded);
            this.spawnEnemiesInRange(oldEnd, this.levelEndX);
        }
    }

    cleanupLevel() {
        const cutoff = this.scrollX - this.W;
        this.platforms = this.platforms.filter(p => p.x + p.w > cutoff);
        this.enemies   = this.enemies.filter(e => e.x + e.w > cutoff - 100);
        this.shrapnel  = this.shrapnel.filter(s => s.x > cutoff - 200);
    }

    // ── ENEMY ─────────────────────────────────────────────────────────────────

    createEnemy(sp, answer, isCorrect) {
        const EW = 42, EH = 56;
        const enemy = {
            x: sp.x - EW/2, y: sp.y - EH,
            w: EW, h: EH, vy: 0,
            answer, isCorrect,
            color: this.COLORS[Math.floor(Math.random()*this.COLORS.length)],
            avatarImg: null, alive: true,
            patrolCX: sp.x, patrolRange: 50,
            patrolDir: Math.random()<0.5?1:-1,
            patrolTimer: Math.random()*2+1,
            onGround: false,
            // Thank-you fly animation state
            flyingToHud: false, flyX: 0, flyY: 0, flyAlpha: 1, flyScale: 1,
        };
        this.loadRandomAvatarForEnemy(enemy);
        return enemy;
    }

    // ── START ─────────────────────────────────────────────────────────────────

    async startGame(grade, timer) {
        this.grade = grade; this.timerTotal = timer; this.timerRemaining = timer;
        this.lives = 3; this.questionsCompleted = 0; this.currentQ = 0;
        this.enemies = []; this.platforms = [];
        this.shrapnel = []; this.particles = [];
        this.savedFriends = [];
        this.flyingFriends = [];
        this.gameOver = false; this.jumpConsumed = false;
        this.scrollX = 0; this.levelEndX = 0;

        this.questions = Array.from({ length: this.TOTAL_Q }, () => this.makeQuestion());

        // Wait for player avatar before first frame
        await this.loadAvatar();

        // Wait for layout to settle before measuring
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        this.resizeCanvas();

        // Generate initial level
        this.levelEndX = this.generateTerrain(0, this.W * 4);
        this.spawnEnemiesInRange(this.W * 0.5, this.levelEndX);

        this.player = {
            x: 80, y: this.H - this.GH - 60,
            w: 36, h: 58, vx: 0, vy: 0,
            onGround: false, facingRight: true, invTimer: 0,
            prevY: this.H - this.GH - 60,
        };

        if (this.timerInterval) clearInterval(this.timerInterval);
        if (timer > 0) {
            this.updateTimerDisplay();
            document.getElementById('battle-timer-display').style.display = 'block';
            this.timerInterval = setInterval(() => {
                this.timerRemaining--;
                this.updateTimerDisplay();
                if (this.timerRemaining <= 0) { clearInterval(this.timerInterval); this.endGame(false); }
            }, 1000);
        } else {
            document.getElementById('battle-timer-display').style.display = 'none';
        }

        this.updateLivesDisplay();
        this.isRunning = true; this.gameOver = false;
        this.lastTime = performance.now();
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.loop(this.lastTime);
    }

    // ── GAME LOOP ─────────────────────────────────────────────────────────────

    loop(ts) {
        if (!this.isRunning) return;
        const dt = Math.min((ts - this.lastTime)/1000, 0.05);
        this.lastTime = ts;
        this.update(dt);
        this.render();
        this.animFrame = requestAnimationFrame(t => this.loop(t));
    }

    update(dt) {
        if (this.gameOver) return;
        this.updatePlayer(dt);
        this.updateEnemies(dt);
        this.updateShrapnel(dt);
        this.updateParticles(dt);
        this.updateFlyingFriends(dt);
        this.checkCollisions();
        this.extendLevel();
        this.cleanupLevel();

        // Smooth camera follow (lerp)
        const targetX = Math.max(0, this.player.x - this.W * 0.35);
        this.scrollX += (targetX - this.scrollX) * 0.1;
    }

    // ── PLAYER ────────────────────────────────────────────────────────────────

    updatePlayer(dt) {
        const p = this.player; if (!p) return;

        p.prevY = p.y;

        if      (this.controls.left)  { p.vx = -this.PLAYER_SPEED; p.facingRight = false; }
        else if (this.controls.right) { p.vx =  this.PLAYER_SPEED; p.facingRight = true;  }
        else p.vx *= 0.6;

        if (this.controls.jump && !this.jumpConsumed && p.onGround) {
            p.vy = this.JUMP_VEL; this.jumpConsumed = true;
        }
        if (!this.controls.jump) this.jumpConsumed = false;

        p.vy += this.GRAVITY * dt;
        p.x  += p.vx * dt;
        p.y  += p.vy * dt;
        if (p.x < 0) p.x = 0;

        p.onGround = false;
        for (const pl of this.platforms) {
            if (p.vy >= 0 && p.x+p.w > pl.x && p.x < pl.x+pl.w &&
                p.y+p.h >= pl.y && p.y+p.h - p.vy*dt <= pl.y + 8) {
                p.y = pl.y - p.h; p.vy = 0; p.onGround = true;
            }
        }

        // Fell into pit
        if (p.y > this.H + 40) {
            this.playerHit();
            // Respawn on nearest ground ahead
            const rx = p.x + 60;
            const surf = this.findSurfaceAt(rx) || this.findSurfaceAt(rx+100) || { y: this.H - this.GH };
            p.x = rx; p.y = surf.y - p.h; p.vy = 0;
        }

        if (p.invTimer > 0) p.invTimer -= dt;
    }

    // ── ENEMIES ───────────────────────────────────────────────────────────────

    updateEnemies(dt) {
        for (const e of this.enemies) {
            if (!e.alive) continue;
            // Patrol
            e.patrolTimer -= dt;
            if (e.patrolTimer <= 0) { e.patrolDir *= -1; e.patrolTimer = Math.random()*2+1; }
            e.x += e.patrolDir * 45 * dt;
            const minX = e.patrolCX - e.patrolRange;
            const maxX = e.patrolCX + e.patrolRange;
            if (e.x + e.w/2 < minX) { e.x = minX - e.w/2; e.patrolDir = 1; }
            if (e.x + e.w/2 > maxX) { e.x = maxX - e.w/2; e.patrolDir = -1; }

            // Gravity
            e.vy += this.GRAVITY * dt;
            e.y  += e.vy * dt;
            e.onGround = false;
            for (const pl of this.platforms) {
                if (e.vy >= 0 && e.x+e.w > pl.x && e.x < pl.x+pl.w &&
                    e.y+e.h >= pl.y && e.y+e.h - e.vy*dt <= pl.y+8) {
                    e.y = pl.y - e.h; e.vy = 0; e.onGround = true;
                }
            }
            // Remove if fell off
            if (e.y > this.H + 80) e.alive = false;
        }
    }

    updateShrapnel(dt) {
        for (const s of this.shrapnel) {
            s.x+=s.vx*dt; s.y+=s.vy*dt;
            s.vy+=this.GRAVITY*0.2*dt; s.vx*=0.995; s.life-=dt;
        }
        this.shrapnel = this.shrapnel.filter(s => s.life > 0);
    }

    updateParticles(dt) {
        for (const p of this.particles) {
            p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt; p.alpha=p.life/p.maxLife;
        }
        this.particles = this.particles.filter(p => p.life > 0);
    }

    updateFlyingFriends(dt) {
        for (const f of this.flyingFriends) {
            f.t += dt * 1.8;
            if (f.t >= 1) { f.t = 1; f.done = true; }
            const t = f.t;
            // Ease out cubic
            const ease = 1 - Math.pow(1 - t, 3);
            f.curX = f.startX + (f.targetX - f.startX) * ease;
            f.curY = f.startY + (f.targetY - f.startY) * ease - Math.sin(t * Math.PI) * 60;
            f.curScale = 1 - ease * 0.4;
            f.curAlpha = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2 * 0.3;
        }
        const justLanded = this.flyingFriends.filter(f => f.done);
        this.flyingFriends = this.flyingFriends.filter(f => !f.done);
        for (const f of justLanded) {
            this.savedFriends.push(f.img);
        }
    }

    // ── COLLISION ─────────────────────────────────────────────────────────────

    checkCollisions() {
        const p = this.player;
        if (!p || p.invTimer > 0) return;

        // Shrink hitboxes inward for fairer detection
        const px = p.x + 5, py = p.y + 3, pw = p.w - 10, ph = p.h - 3;

        for (const e of this.enemies) {
            if (!e.alive) continue;
            const ex = e.x + 5, ey = e.y + 4, ew = e.w - 10, eh = e.h - 4;

            // AABB overlap
            if (!(px+pw > ex && px < ex+ew && py+ph > ey && py < ey+eh)) continue;

            // Stomp: player falling AND feet were above enemy top last frame
            const prevFeetY = p.prevY + p.h;
            if (p.vy > 0 && prevFeetY <= e.y + 4) {
                p.vy = this.JUMP_VEL * 0.55;
                if (e.isCorrect) {
                    // Stomped a friend — lose a life!
                    this.onStompFriend(e);
                } else {
                    // Stomped a wrong enemy — kill it
                    e.alive = false;
                    this.onStompWrong(e);
                }
            } else {
                // Side hit
                if (e.isCorrect) {
                    // Found a friend — save them!
                    this.onSaveFriend(e);
                    p.vy = this.JUMP_VEL * 0.25;
                } else {
                    // Hit by wrong enemy — knockback
                    this.playerHit();
                    p.vy = this.JUMP_VEL * 0.35;
                    p.vx = (p.x < e.x) ? -280 : 280;
                }
            }
            break;
        }

        // Shrapnel is visual-only, no player damage

        this.enemies = this.enemies.filter(e => e.alive);
    }

    onStompFriend(e) {
        // Stomping a friend (correct answer) — you lose a life
        e.alive = false;
        this.spawnParticles(e.x+e.w/2, e.y+e.h/2, '#ff3300', '#ff6600', 20);
        this.playerHit();
    }

    onSaveFriend(e) {
        // Side-hit correct answer — save the friend!
        e.alive = false;

        // Thank-you particles (green/gold)
        this.spawnParticles(e.x+e.w/2, e.y+e.h/2, '#4CAF50', '#FFD700', 20);

        // Start fly-to-HUD animation
        const hudIdx = this.savedFriends.length + this.flyingFriends.length;
        const targetX = 10 + hudIdx * 40;
        const targetY = 10;
        this.flyingFriends.push({
            img: e.avatarImg,
            startX: e.x - this.scrollX,
            startY: e.y,
            targetX, targetY,
            curX: e.x - this.scrollX, curY: e.y,
            curScale: 1, curAlpha: 1,
            t: 0, done: false,
        });

        this.questionsCompleted++;
        if (this.questionsCompleted >= this.TOTAL_Q) {
            setTimeout(() => this.endGame(true), 600);
            return;
        }
        this.currentQ++;
        // Mark all old correct enemies as wrong
        this.enemies.forEach(en => {
            if (en.alive && en.isCorrect) {
                en.isCorrect = false;
                en.answer = this.randomWrongAnswer();
            }
        });
    }

    onStompWrong(e) {
        const cx = e.x+e.w/2, cy = e.y+e.h/2;
        this.spawnParticles(cx, cy, '#ff9500', '#ffcc00', 45);
        this.spawnParticles(cx, cy, '#ff3300', '#ff6600', 30);
        this.spawnShrapnel(cx, cy, 30);
    }

    spawnParticles(cx, cy, c1, c2, n) {
        for (let i=0; i<n; i++) {
            const ang=(i/n)*Math.PI*2+Math.random()*0.5;
            const spd=80+Math.random()*150;
            const ml=0.5+Math.random()*0.3;
            this.particles.push({
                x:cx,y:cy,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd-40,
                r:3+Math.random()*4,color:Math.random()<0.5?c1:c2,
                life:ml,maxLife:ml,alpha:1
            });
        }
    }

    spawnShrapnel(cx, cy, n) {
        for (let i=0; i<n; i++) {
            const ang=Math.random()*Math.PI*2;
            const spd=350+Math.random()*500;
            this.shrapnel.push({
                x:cx,y:cy,
                vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd-200,
                r:4+Math.random()*7,
                color:`hsl(${10+Math.random()*40},95%,${45+Math.random()*20}%)`,
                life:3+Math.random()*2.5
            });
        }
    }

    playerHit() {
        if (this.player && this.player.invTimer > 0) return;
        this.lives = Math.max(0, this.lives-1);
        this.updateLivesDisplay();
        if (this.player) this.player.invTimer = 2.2;
        if (this.lives <= 0) this.endGame(false);
    }

    // ── RENDER ────────────────────────────────────────────────────────────────

    render() {
        const ctx = this.ctx; if (!ctx) return;
        ctx.clearRect(0, 0, this.W, this.H);
        this.drawBG();
        ctx.save();
        ctx.translate(-this.scrollX, 0);
        this.drawPlatforms();
        this.drawShrapnelWorld();
        this.drawEnemies();
        this.drawPlayer();
        this.drawParticlesWorld();
        this.drawQuestion();
        ctx.restore();
        // HUD (screen-space, drawn after ctx.restore)
        this.drawFriendsHUD();
        this.drawFlyingFriends();
    }

    drawBG() {
        const ctx = this.ctx;
        const g = ctx.createLinearGradient(0,0,0,this.H);
        g.addColorStop(0,'#87CEEB'); g.addColorStop(1,'#cde9ff');
        ctx.fillStyle = g; ctx.fillRect(0,0,this.W,this.H);
        // Parallax clouds
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        const ox = this.scrollX * 0.15;
        for (let i = 0; i < 6; i++) {
            const cx = (i * 220 + 80 - ox % 1320 + 1320) % 1320 - 60;
            const cy = 20 + (i%3) * 25 + Math.sin(i*1.7)*15;
            const sz = 36 + (i%3)*12;
            this.drawCloud(ctx, cx, cy, sz);
        }
    }

    drawCloud(ctx,x,y,s) {
        ctx.beginPath();
        ctx.arc(x,y,s*0.5,0,Math.PI*2);
        ctx.arc(x+s*0.42,y-s*0.08,s*0.38,0,Math.PI*2);
        ctx.arc(x-s*0.38,y+s*0.05,s*0.32,0,Math.PI*2);
        ctx.arc(x+s*0.72,y+s*0.10,s*0.28,0,Math.PI*2);
        ctx.fill();
    }

    drawPlatforms() {
        const ctx = this.ctx;
        const lo = this.scrollX - 50, hi = this.scrollX + this.W + 50;
        for (const pl of this.platforms) {
            if (pl.x + pl.w < lo || pl.x > hi) continue;
            if (pl.isGround) {
                ctx.fillStyle = '#5a9e6e';
                ctx.fillRect(pl.x, pl.y, pl.w, 10);
                ctx.fillStyle = '#7a5230';
                ctx.fillRect(pl.x, pl.y+10, pl.w, pl.h-10);
                ctx.fillStyle = '#3d7a50';
                for (let gx = 8; gx < pl.w; gx += 16)
                    ctx.fillRect(pl.x+gx, pl.y-5, 3, 6);
            } else {
                ctx.fillStyle = '#8B6914';
                bRR(ctx, pl.x, pl.y, pl.w, pl.h, 5); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.22)';
                ctx.fillRect(pl.x+4, pl.y+2, pl.w-8, 3);
            }
        }
    }

    drawPlayer() {
        const ctx = this.ctx, p = this.player; if (!p) return;
        if (p.invTimer > 0 && Math.floor(p.invTimer*9)%2===0) return;
        ctx.save();
        if (!p.facingRight) {
            ctx.translate(p.x+p.w/2,0); ctx.scale(-1,1); ctx.translate(-(p.x+p.w/2),0);
        }
        if (this.avatarLoaded && this.avatarImg)
            ctx.drawImage(this.avatarImg, p.x-1, p.y, p.w+2, p.h-4);
        else
            this.drawFallback(ctx, p.x, p.y, p.w, p.h, '#667eea');
        ctx.restore();
    }

    drawFallback(ctx, x, y, w, h, col) {
        const cx = x+w/2;
        ctx.fillStyle = col;
        bRR(ctx, x+4, y+h*0.35, w-8, h*0.4, 4); ctx.fill();
        ctx.fillStyle = '#FFD0A8';
        ctx.beginPath(); ctx.arc(cx, y+h*0.2, w*0.28, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(cx+4, y+h*0.17, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = col;
        ctx.fillRect(x+4, y+h*0.75, w/2-5, h*0.25);
        ctx.fillRect(x+w/2+1, y+h*0.75, w/2-5, h*0.25);
    }

    drawEnemies() {
        const ctx = this.ctx;
        const lo = this.scrollX-60, hi = this.scrollX+this.W+60;
        for (const e of this.enemies) {
            if (!e.alive || e.x+e.w < lo || e.x > hi) continue;
            const cx = e.x+e.w/2;

            ctx.save();
            // Face toward player
            const pDir = (this.player && this.player.x+this.player.w/2 > cx) ? 1 : -1;
            if (pDir<0) { ctx.translate(cx,0); ctx.scale(-1,1); ctx.translate(-cx,0); }

            if (e.avatarImg)
                ctx.drawImage(e.avatarImg, e.x-1, e.y, e.w+2, e.h-4);
            else
                this.drawFallback(ctx, e.x, e.y, e.w, e.h, e.color);
            ctx.restore();

            // Answer label
            const ans = String(e.answer);
            ctx.font = 'bold 13px Arial';
            const tw = ctx.measureText(ans).width;
            const lw=tw+16, lh=22, lx=cx-lw/2, ly=e.y-lh-5;
            ctx.fillStyle = 'rgba(25,25,45,0.88)';
            bRR(ctx, lx, ly, lw, lh, 7); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
            ctx.fillText(ans, cx, ly+lh-6);
        }
    }

    drawQuestion() {
        if (!this.player || this.questionsCompleted >= this.TOTAL_Q) return;
        const q = this.questions[this.currentQ]; if (!q) return;
        const ctx = this.ctx, p = this.player, text = q.text;
        ctx.font = 'bold 15px Arial';
        const tw = ctx.measureText(text).width;
        const bw=tw+20, bh=26;
        const bx=p.x+p.w/2-bw/2, by=p.y-bh-14;
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.strokeStyle = '#667eea'; ctx.lineWidth = 2;
        bRR(ctx, bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.beginPath();
        ctx.moveTo(p.x+p.w/2-5, by+bh);
        ctx.lineTo(p.x+p.w/2, by+bh+9);
        ctx.lineTo(p.x+p.w/2+5, by+bh);
        ctx.fill();
        ctx.fillStyle = '#333'; ctx.textAlign = 'center';
        ctx.fillText(text, p.x+p.w/2, by+bh-7);
    }

    drawShrapnelWorld() {
        const ctx = this.ctx;
        for (const s of this.shrapnel) {
            ctx.globalAlpha = Math.min(1, s.life/1.2);
            ctx.fillStyle = s.color;
            ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.x*0.06);
            ctx.beginPath();
            ctx.moveTo(0,-s.r); ctx.lineTo(s.r*0.6,s.r*0.8); ctx.lineTo(-s.r*0.6,s.r*0.8);
            ctx.closePath(); ctx.fill(); ctx.restore();
        }
        ctx.globalAlpha = 1;
    }

    drawParticlesWorld() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    drawFriendsHUD() {
        const ctx = this.ctx;
        const size = 34;
        for (let i = 0; i < this.savedFriends.length; i++) {
            const x = 10 + i * 40;
            const y = 10;
            // Green circle background
            ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.beginPath(); ctx.arc(x + size/2, y + size/2, size/2 + 3, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#4CAF50'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x + size/2, y + size/2, size/2 + 3, 0, Math.PI*2); ctx.stroke();
            if (this.savedFriends[i]) {
                ctx.drawImage(this.savedFriends[i], x, y, size, size);
            }
        }
        // Draw empty slots for remaining friends
        for (let i = this.savedFriends.length; i < this.TOTAL_Q; i++) {
            const x = 10 + i * 40;
            const y = 10;
            ctx.fillStyle = 'rgba(200, 200, 200, 0.25)';
            ctx.beginPath(); ctx.arc(x + size/2, y + size/2, size/2 + 3, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x + size/2, y + size/2, size/2 + 3, 0, Math.PI*2); ctx.stroke();
            // Question mark
            ctx.fillStyle = 'rgba(150, 150, 150, 0.6)';
            ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
            ctx.fillText('?', x + size/2, y + size/2 + 6);
        }
    }

    drawFlyingFriends() {
        const ctx = this.ctx;
        const size = 34;
        for (const f of this.flyingFriends) {
            ctx.save();
            ctx.globalAlpha = f.curAlpha;
            const s = f.curScale;
            const drawSize = size * s;
            if (f.img) {
                ctx.drawImage(f.img, f.curX - drawSize/2, f.curY - drawSize/2, drawSize, drawSize);
            }
            ctx.restore();
        }
    }

    // ── UI ────────────────────────────────────────────────────────────────────

    updateLivesDisplay() {
        const el = document.getElementById('battle-lives');
        if (el) el.innerHTML = '❤️'.repeat(Math.max(0,this.lives))+'🖤'.repeat(Math.max(0,3-this.lives));
    }
    updateTimerDisplay() {
        const el = document.getElementById('battle-timer-display');
        if (el) el.textContent = this.timerRemaining+'s';
    }

    endGame(won) {
        if (this.gameOver) return;
        this.gameOver = true; this.isRunning = false;
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.controls = { left:false, right:false, jump:false };
        if (typeof app !== 'undefined')
            setTimeout(() => app.showBattleResults(this.questionsCompleted, this.TOTAL_Q, won), 420);
    }

    stopGame() {
        this.gameOver = true; this.isRunning = false;
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.controls = { left:false, right:false, jump:false };
    }
}

// Helpers
function bShuffle(arr) {
    for (let i=arr.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    return arr;
}
function bRR(ctx,x,y,w,h,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
const battleGame = new BattleGameClass();
