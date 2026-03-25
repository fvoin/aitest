// Battle Game — 2D platformer with math-answer enemies
class BattleGameClass {
    constructor() {
        // Physics
        this.GRAVITY         = 860;
        this.PLAYER_SPEED    = 185;
        this.JUMP_VEL        = -435;
        this.BULLET_SPEED    = 570;
        this.ENEMY_BUL_SPEED = 255;
        this.SHOOT_CD        = 0.42;
        this.TOTAL_Q         = 10;
        this.ENEMY_COUNT     = 3;

        // Runtime
        this.canvas   = null;
        this.ctx      = null;
        this.animFrame = null;
        this.isRunning = false;
        this.lastTime  = 0;
        this.W = 0; this.H = 0;

        // Game state
        this.lives              = 3;
        this.questionsCompleted = 0;
        this.currentQ           = 0;
        this.grade              = '1';
        this.timerTotal         = 0;
        this.timerRemaining     = 0;
        this.timerInterval      = null;
        this.gameOver           = false;

        // Objects
        this.player        = null;
        this.enemies       = [];
        this.playerBullets = [];
        this.enemyBullets  = [];
        this.shrapnel      = [];
        this.particles     = [];
        this.platforms     = [];
        this.spawnPoints   = [];

        // Pre-generated content
        this.questions      = [];
        this.enemySpawnPlan = [];

        // Controls
        this.shootCooldown = 0;
        this.controls      = { left: false, right: false, jump: false, shoot: false };
        this.jumpConsumed  = false;
        this.shootConsumed = false;

        // Avatar
        this.avatarImg    = null;
        this.avatarLoaded = false;

        // Monster palette
        this.COLORS = ['#ff6b6b','#ff9f43','#26de81','#45aaf2','#fd79a8','#a29bfe','#00cec9','#e17055'];
    }

    // ── INIT ──────────────────────────────────────────────────────────────────

    async init() {
        this.canvas = document.getElementById('battle-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.setupControls();
        await this.loadAvatar();
    }

    async loadAvatar() {
        this.avatarLoaded = false;
        if (typeof AvatarManager === 'undefined') return;
        try {
            const svg  = AvatarManager.getSVG(80, false);
            const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url  = URL.createObjectURL(blob);
            await new Promise(resolve => {
                const img = new Image();
                img.onload = () => { this.avatarImg = img; this.avatarLoaded = true; URL.revokeObjectURL(url); resolve(); };
                img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
                img.src = url;
            });
        } catch (e) { /* fallback to drawn player */ }
    }

    setupControls() {
        const map = { left:'battle-left-btn', right:'battle-right-btn', jump:'battle-jump-btn', shoot:'battle-shoot-btn' };
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
            if (e.key === 'ArrowLeft'  || e.key === 'a') this.controls.left  = true;
            if (e.key === 'ArrowRight' || e.key === 'd') this.controls.right = true;
            if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') && !e.repeat) this.controls.jump  = true;
            if ((e.key === 'z' || e.key === 'Enter')                      && !e.repeat) this.controls.shoot = true;
        });
        document.addEventListener('keyup', e => {
            if (e.key === 'ArrowLeft'  || e.key === 'a') this.controls.left  = false;
            if (e.key === 'ArrowRight' || e.key === 'd') this.controls.right = false;
            if (e.key === 'ArrowUp'   || e.key === 'w' || e.key === ' ')  this.controls.jump  = false;
            if (e.key === 'z'         || e.key === 'Enter')               this.controls.shoot = false;
        });
    }

    // ── SETUP ─────────────────────────────────────────────────────────────────

    resizeCanvas() {
        const hdr  = document.getElementById('battle-header');
        const ctrl = document.getElementById('battle-controls');
        const hh   = hdr  ? hdr.offsetHeight  : 52;
        const ch   = ctrl ? ctrl.offsetHeight : 92;
        const W = Math.min(window.innerWidth, 600);
        const H = Math.max(230, Math.min(430, window.innerHeight - hh - ch - 2));
        this.canvas.width  = W; this.canvas.height = H;
        this.W = W; this.H = H;
    }

    createPlatforms() {
        const W = this.W, H = this.H, GH = 42;
        const ri = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
        this.platforms = [
            { x: 0, y: H - GH, w: W, h: GH, isGround: true },
        ];

        // Random floating platforms (3–5), spread across height layers
        const layers = [
            { yMin: H - GH - 135, yMax: H - GH - 95 },
            { yMin: H - GH - 135, yMax: H - GH - 95 },
            { yMin: H - GH - 215, yMax: H - GH - 165 },
            { yMin: H - GH - 215, yMax: H - GH - 165 },
            { yMin: H - GH - 280, yMax: H - GH - 240 },
        ];
        const numPlats = ri(3, 5);
        for (let i = 0; i < numPlats; i++) {
            const layer = layers[i % layers.length];
            if (layer.yMin < 20) continue; // skip if too high for canvas
            const pw = ri(90, 150);
            const px = ri(10, W - pw - 10);
            const py = ri(layer.yMin, layer.yMax);
            // Check overlap
            let ok = true;
            for (const pl of this.platforms) {
                if (!pl.isGround && Math.abs(pl.y - py) < 35 && !(px + pw < pl.x - 15 || px > pl.x + pl.w + 15)) {
                    ok = false; break;
                }
            }
            if (ok) this.platforms.push({ x: px, y: py, w: pw, h: 14, isGround: false });
        }

        // Spawn points: 3 on ground + 1 per floating platform
        this.spawnPoints = [
            { x: W * 0.2,  y: H - GH },
            { x: W * 0.5,  y: H - GH },
            { x: W * 0.8,  y: H - GH },
        ];
        for (const pl of this.platforms) {
            if (!pl.isGround) this.spawnPoints.push({ x: pl.x + pl.w / 2, y: pl.y });
        }
    }

    // ── QUESTION GENERATION ───────────────────────────────────────────────────

    makeQuestion() {
        const g  = parseInt(this.grade);
        const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
        let text, answer;

        if (g === 1) {
            const a = ri(1,9), b = ri(1,9);
            text = `${a} + ${b}`; answer = a + b;
        } else if (g === 2) {
            if (Math.random() < 0.5) { const a=ri(5,15),b=ri(1,10); text=`${a} + ${b}`; answer=a+b; }
            else                     { const a=ri(8,20),b=ri(1,a-1); text=`${a} − ${b}`; answer=a-b; }
        } else if (g === 3) {
            const a = ri(2,10), b = ri(2,10);
            text = `${a} × ${b}`; answer = a * b;
        } else if (g === 4) {
            const t = ri(0,2);
            if (t===0) { const a=ri(20,80),b=ri(10,50); text=`${a} + ${b}`; answer=a+b; }
            else if (t===1) { const a=ri(30,100),b=ri(5,25); text=`${a} − ${b}`; answer=a-b; }
            else { const a=ri(3,12),b=ri(3,12); text=`${a} × ${b}`; answer=a*b; }
        } else {
            const a = ri(4,15), b = ri(4,15);
            text = `${a} × ${b}`; answer = a * b;
        }
        return { text, answer, wrongs: this.makeWrongs(answer, this.ENEMY_COUNT - 1) };
    }

    makeWrongs(correct, n) {
        const set = new Set();
        const spread = Math.max(5, Math.ceil(Math.abs(correct) * 0.28));
        let tries = 0;
        while (set.size < n && tries++ < 300) {
            const delta = Math.floor(Math.random() * spread * 2) - spread;
            if (delta !== 0) { const w = correct + delta; if (w > 0 && w !== correct) set.add(w); }
        }
        return [...set];
    }

    generateSpawnPlan() {
        // For each question, which enemy slot carries the correct answer.
        // Last slot = newly spawned enemy. Mix new vs existing.
        const last = this.ENEMY_COUNT - 1;
        return Array.from({ length: this.TOTAL_Q }, () =>
            Math.random() < 0.4 ? last : Math.floor(Math.random() * last)
        );
    }

    // ── ENEMY FACTORY ─────────────────────────────────────────────────────────

    createEnemy(sp, answer, isCorrect) {
        const EW = 44, EH = 58;
        const enemy = {
            x: sp.x - EW / 2, y: sp.y - EH,
            w: EW, h: EH, vy: 0,
            answer, isCorrect,
            color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)],
            avatarImg: null,
            alive: true,
            patrolCX: sp.x, patrolRange: 58,
            patrolDir: Math.random() < 0.5 ? 1 : -1,
            patrolTimer: Math.random() * 2 + 1,
            shootTimer: Math.random() * 2 + 1.5,
            jumpTimer: Math.random() * 3 + 3,
            onGround: false,
        };
        this.loadRandomAvatarForEnemy(enemy);
        return enemy;
    }

    loadRandomAvatarForEnemy(enemy) {
        if (typeof AvatarManager === 'undefined') return;
        const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
        const saved = { ...AvatarManager.current };
        AvatarManager.current = {
            faceForm:   rnd(AvatarManager.parts.faceForm),
            faceColor:  rnd(AvatarManager.colors.face),
            eyesForm:   rnd(['angry','cool','surprised','normal','wink']),
            eyesColor:  rnd(AvatarManager.colors.eyes),
            hairType:   rnd(AvatarManager.parts.hairType),
            hairColor:  rnd(AvatarManager.colors.hair),
            noseType:   rnd(AvatarManager.parts.noseType),
            lipsType:   rnd(['normal','wide','vampire','duck-face','smile']),
            accessory:  rnd(AvatarManager.parts.accessory),
            outfit:     rnd(AvatarManager.parts.outfit),
            outfitColor:rnd(AvatarManager.colors.outfit),
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
        } catch (e) { /* fallback to blob monster */ }
    }

    initEnemies() {
        const q = this.questions[0];
        const cs = this.enemySpawnPlan[0];
        const wrongs = [...q.wrongs]; bShuffle(wrongs);
        let wi = 0;
        for (let i = 0; i < this.ENEMY_COUNT; i++) {
            const sp  = this.spawnPoints[i % this.spawnPoints.length];
            const ans = i === cs ? q.answer : wrongs[wi++ % wrongs.length];
            this.enemies.push(this.createEnemy(sp, ans, i === cs));
        }
    }

    // ── START GAME ────────────────────────────────────────────────────────────

    startGame(grade, timer) {
        this.grade = grade; this.timerTotal = timer; this.timerRemaining = timer;
        this.lives = 3; this.questionsCompleted = 0; this.currentQ = 0;
        this.enemies = []; this.playerBullets = []; this.enemyBullets = [];
        this.shrapnel = []; this.particles = [];
        this.gameOver = false; this.shootCooldown = 0;
        this.jumpConsumed = false; this.shootConsumed = false;

        this.questions      = Array.from({ length: this.TOTAL_Q }, () => this.makeQuestion());
        this.enemySpawnPlan = this.generateSpawnPlan();

        // Reload player avatar (picks up latest customization)
        this.loadAvatar();

        this.resizeCanvas();
        this.createPlatforms();

        const GH = 42;
        this.player = {
            x: 60, y: this.H - GH - 60,
            w: 36, h: 60, vx: 0, vy: 0,
            onGround: false, facingRight: true, invTimer: 0,
        };

        this.initEnemies();

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
        this.updateQDisplay();
        this.isRunning = true; this.gameOver = false;
        this.lastTime = performance.now();
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.loop(this.lastTime);
    }

    // ── GAME LOOP ─────────────────────────────────────────────────────────────

    loop(ts) {
        if (!this.isRunning) return;
        const dt = Math.min((ts - this.lastTime) / 1000, 0.05);
        this.lastTime = ts;
        this.update(dt);
        this.render();
        this.animFrame = requestAnimationFrame(t => this.loop(t));
    }

    update(dt) {
        if (this.gameOver) return;
        this.updatePlayer(dt);
        this.updateEnemies(dt);
        this.updateBullets(dt);
        this.updateShrapnel(dt);
        this.updateParticles(dt);
        this.checkCollisions();
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        if (this.controls.shoot && !this.shootConsumed && this.shootCooldown <= 0) {
            this.playerShoot();
            this.shootCooldown = this.SHOOT_CD;
            this.shootConsumed = true;
        }
        if (!this.controls.shoot) this.shootConsumed = false;
    }

    // ── PLAYER PHYSICS ────────────────────────────────────────────────────────

    updatePlayer(dt) {
        const p = this.player;
        if (!p) return;

        if      (this.controls.left)  { p.vx = -this.PLAYER_SPEED; p.facingRight = false; }
        else if (this.controls.right) { p.vx =  this.PLAYER_SPEED; p.facingRight = true;  }
        else p.vx *= 0.65;

        if (this.controls.jump && !this.jumpConsumed && p.onGround) {
            p.vy = this.JUMP_VEL; this.jumpConsumed = true;
        }
        if (!this.controls.jump) this.jumpConsumed = false;

        p.vy += this.GRAVITY * dt;
        p.x  += p.vx * dt;
        p.y  += p.vy * dt;
        p.x   = Math.max(0, Math.min(this.W - p.w, p.x));

        p.onGround = false;
        for (const pl of this.platforms) {
            if (p.vy >= 0 && p.x + p.w > pl.x && p.x < pl.x + pl.w &&
                p.y + p.h >= pl.y && p.y + p.h - p.vy * dt <= pl.y + 8) {
                p.y = pl.y - p.h; p.vy = 0; p.onGround = true;
            }
        }
        // Fell off bottom → respawn, lose life
        if (p.y > this.H + 30) {
            p.x = this.W / 2 - p.w / 2;
            p.y = this.platforms[0].y - p.h;
            p.vy = 0;
            this.playerHit();
        }
        if (p.invTimer > 0) p.invTimer -= dt;
    }

    // ── ENEMY UPDATES ─────────────────────────────────────────────────────────

    updateEnemies(dt) {
        for (const e of this.enemies) {
            if (!e.alive) continue;

            e.patrolTimer -= dt;
            if (e.patrolTimer <= 0) { e.patrolDir *= -1; e.patrolTimer = Math.random() * 2 + 1; }
            e.x += e.patrolDir * 55 * dt;

            const minX = e.patrolCX - e.patrolRange - e.w / 2;
            const maxX = e.patrolCX + e.patrolRange - e.w / 2;
            if (e.x < minX) { e.x = minX; e.patrolDir =  1; }
            if (e.x > maxX) { e.x = maxX; e.patrolDir = -1; }
            e.x = Math.max(0, Math.min(this.W - e.w, e.x));

            // Gravity + platform landing
            e.vy += this.GRAVITY * dt;
            e.y  += e.vy * dt;
            e.onGround = false;
            for (const pl of this.platforms) {
                if (e.vy >= 0 && e.x + e.w > pl.x && e.x < pl.x + pl.w &&
                    e.y + e.h >= pl.y && e.y + e.h - e.vy * dt <= pl.y + 8) {
                    e.y = pl.y - e.h; e.vy = 0; e.onGround = true;
                }
            }
            // Fell off bottom → respawn on ground
            if (e.y > this.H + 40) {
                e.x = e.patrolCX - e.w / 2;
                e.y = this.platforms[0].y - e.h;
                e.vy = 0;
            }

            // Random jumping between platforms
            e.jumpTimer -= dt;
            if (e.jumpTimer <= 0 && e.onGround) {
                e.vy = this.JUMP_VEL * 0.9;
                e.onGround = false;
                e.jumpTimer = Math.random() * 4 + 3;
                // Update patrol center to current position after landing
                e.patrolCX = e.x + e.w / 2;
            }

            // Shoot at player
            e.shootTimer -= dt;
            if (e.shootTimer <= 0 && this.player && !this.gameOver) {
                e.shootTimer = Math.random() * 2 + 1.5;
                this.enemyShoot(e);
            }
        }
    }

    enemyShoot(e) {
        if (!this.player) return;
        const ex = e.x + e.w / 2, ey = e.y + e.h * 0.38;
        const px = this.player.x + this.player.w / 2, py = this.player.y + this.player.h / 2;
        const dx = px - ex, dy = py - ey, len = Math.sqrt(dx*dx+dy*dy)||1;
        this.enemyBullets.push({ x:ex, y:ey, vx:dx/len*this.ENEMY_BUL_SPEED, vy:dy/len*this.ENEMY_BUL_SPEED, life:4 });
    }

    playerShoot() {
        const p   = this.player;
        const dir = p.facingRight ? 1 : -1;
        this.playerBullets.push({
            x: p.facingRight ? p.x + p.w + 2 : p.x - 4,
            y: p.y + p.h * 0.32,
            vx: dir * this.BULLET_SPEED, vy: 0, life: 3
        });
    }

    // ── BULLET + SHRAPNEL + PARTICLE UPDATES ─────────────────────────────────

    updateBullets(dt) {
        for (const b of this.playerBullets) { b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt; }
        for (const b of this.enemyBullets)  { b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt; }
        const inBounds = b => b.life>0 && b.x>-40 && b.x<this.W+40 && b.y>-40 && b.y<this.H+40;
        this.playerBullets = this.playerBullets.filter(inBounds);
        this.enemyBullets  = this.enemyBullets.filter(inBounds);
    }

    updateShrapnel(dt) {
        for (const s of this.shrapnel) {
            s.x+=s.vx*dt; s.y+=s.vy*dt;
            s.vy+=this.GRAVITY*0.22*dt; s.vx*=0.995; s.life-=dt;
        }
        this.shrapnel = this.shrapnel.filter(s => s.life > 0);
    }

    updateParticles(dt) {
        for (const p of this.particles) {
            p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt; p.alpha=p.life/p.maxLife;
        }
        this.particles = this.particles.filter(p => p.life > 0);
    }

    // ── COLLISION ─────────────────────────────────────────────────────────────

    checkCollisions() {
        outer:
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const b = this.playerBullets[i];
            for (const e of this.enemies) {
                if (!e.alive) continue;
                if (b.x>e.x && b.x<e.x+e.w && b.y>e.y && b.y<e.y+e.h) {
                    this.playerBullets.splice(i, 1);
                    e.alive = false;
                    if (e.isCorrect) this.onCorrectKill(e);
                    else             this.onWrongKill(e);
                    continue outer;
                }
            }
        }

        if (this.player && this.player.invTimer <= 0) {
            const p = this.player;
            for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
                const b = this.enemyBullets[i];
                if (b.x>p.x && b.x<p.x+p.w && b.y>p.y && b.y<p.y+p.h) {
                    this.enemyBullets.splice(i, 1); this.playerHit(); break;
                }
            }
        }

        if (this.player && this.player.invTimer <= 0) {
            const p = this.player;
            for (let i = this.shrapnel.length - 1; i >= 0; i--) {
                const s = this.shrapnel[i];
                if (s.x>p.x && s.x<p.x+p.w && s.y>p.y && s.y<p.y+p.h) {
                    this.shrapnel.splice(i, 1); this.playerHit(); break;
                }
            }
        }

        this.enemies = this.enemies.filter(e => e.alive);
    }

    // ── KILL HANDLERS ─────────────────────────────────────────────────────────

    onCorrectKill(e) {
        this.spawnParticles(e.x+e.w/2, e.y+e.h/2, '#4CAF50', '#A5D6A7', 14);
        this.questionsCompleted++;
        this.updateQDisplay();

        if (this.questionsCompleted >= this.TOTAL_Q) {
            setTimeout(() => this.endGame(true), 550);
            return;
        }

        this.currentQ++;
        const q  = this.questions[this.currentQ];
        const cs = this.enemySpawnPlan[this.currentQ];

        const survivors = this.enemies.filter(en => en.alive);
        const wrongs    = [...q.wrongs]; bShuffle(wrongs);
        let wi = 0;

        // Assign answers: slots 0-(n-1) = survivors, slot n = new enemy
        const slotAns = i => i === cs
            ? { ans: q.answer, ok: true }
            : { ans: wrongs[wi++ % wrongs.length], ok: false };

        for (let i = 0; i < survivors.length && i < this.ENEMY_COUNT - 1; i++) {
            const sa = slotAns(i);
            survivors[i].answer    = sa.ans;
            survivors[i].isCorrect = sa.ok;
        }

        // Spawn new enemy at slot index = survivors.length (up to 4)
        const usedXs = survivors.map(en => en.x + en.w / 2);
        const sp  = this.pickFreeSpawn(usedXs);
        const sa4 = slotAns(survivors.length);           // could be slot 4 if cs==4
        // But if survivors.length < 4, cs might equal survivors.length
        // Recalculate correctly:
        const newSlot = survivors.length;
        const newIsCorrect = (newSlot === cs);
        const newAnswer    = newIsCorrect ? q.answer : (wrongs[wi++ % wrongs.length] || wrongs[0]);
        // If correct was already assigned to survivor but shouldn't have been, fix:
        if (newIsCorrect) {
            survivors.forEach(en => en.isCorrect = false);
        }
        this.enemies.push(this.createEnemy(sp, newAnswer, newIsCorrect));
    }

    onWrongKill(e) {
        const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
        this.spawnParticles(cx, cy, '#ff9500', '#ffcc00', 40);
        this.spawnParticles(cx, cy, '#ff3300', '#ff6600', 25);
        this.spawnShrapnel(cx, cy, 30);
    }

    spawnParticles(cx, cy, c1, c2, n) {
        for (let i = 0; i < n; i++) {
            const ang = (i/n)*Math.PI*2 + Math.random()*0.5;
            const spd = 80 + Math.random()*140;
            const ml  = 0.5 + Math.random()*0.3;
            this.particles.push({
                x:cx, y:cy, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd-40,
                r:3+Math.random()*4, color:Math.random()<0.5?c1:c2,
                life:ml, maxLife:ml, alpha:1
            });
        }
    }

    spawnShrapnel(cx, cy, n) {
        for (let i = 0; i < n; i++) {
            const ang = Math.random()*Math.PI*2;
            const spd = 350 + Math.random()*500;
            this.shrapnel.push({
                x:cx, y:cy,
                vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd - 200,
                r:4+Math.random()*7,
                color:`hsl(${10+Math.random()*40},95%,${45+Math.random()*20}%)`,
                life: 3 + Math.random()*2.5
            });
        }
    }

    pickFreeSpawn(usedXs) {
        let best = this.spawnPoints[0], bestDist = 0;
        for (const sp of this.spawnPoints) {
            const d = usedXs.length ? Math.min(...usedXs.map(x => Math.abs(x - sp.x))) : 999;
            if (d > bestDist) { bestDist = d; best = sp; }
        }
        return best;
    }

    playerHit() {
        if (this.player && this.player.invTimer > 0) return;
        this.lives = Math.max(0, this.lives - 1);
        this.updateLivesDisplay();
        if (this.player) this.player.invTimer = 2.2;
        if (this.lives <= 0) this.endGame(false);
    }

    // ── RENDER ────────────────────────────────────────────────────────────────

    render() {
        const ctx = this.ctx;
        if (!ctx) return;
        ctx.clearRect(0, 0, this.W, this.H);
        this.drawBG();
        this.drawPlatforms();
        this.drawShrapnel();
        this.drawEnemyBullets();
        this.drawPlayerBullets();
        this.drawEnemies();
        this.drawPlayer();
        this.drawParticles();
        this.drawQuestion();
    }

    drawBG() {
        const ctx = this.ctx;
        const g = ctx.createLinearGradient(0, 0, 0, this.H);
        g.addColorStop(0, '#87CEEB'); g.addColorStop(1, '#cde9ff');
        ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        this.drawCloud(ctx, this.W*0.12, this.H*0.1,  44);
        this.drawCloud(ctx, this.W*0.55, this.H*0.06, 52);
        this.drawCloud(ctx, this.W*0.84, this.H*0.13, 36);
    }

    drawCloud(ctx, x, y, s) {
        ctx.beginPath();
        ctx.arc(x,             y,         s*0.50, 0, Math.PI*2);
        ctx.arc(x+s*0.42, y-s*0.08,  s*0.38, 0, Math.PI*2);
        ctx.arc(x-s*0.38, y+s*0.05,  s*0.32, 0, Math.PI*2);
        ctx.arc(x+s*0.72, y+s*0.10,  s*0.28, 0, Math.PI*2);
        ctx.fill();
    }

    drawPlatforms() {
        const ctx = this.ctx;
        for (const pl of this.platforms) {
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
        const ctx = this.ctx, p = this.player;
        if (!p) return;
        if (p.invTimer > 0 && Math.floor(p.invTimer*9)%2===0) return;

        ctx.save();
        if (!p.facingRight) {
            ctx.translate(p.x + p.w/2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(p.x + p.w/2), 0);
        }

        if (this.avatarLoaded && this.avatarImg) {
            ctx.drawImage(this.avatarImg, p.x-1, p.y, p.w+2, p.h-6);
        } else {
            this.drawFallbackPlayer(ctx, p);
        }

        // Gun
        ctx.fillStyle = '#444';
        ctx.fillRect(p.x+p.w-2, p.y+Math.round(p.h*0.33), 13, 5);
        ctx.fillStyle = '#222';
        ctx.fillRect(p.x+p.w+9, p.y+Math.round(p.h*0.33)+1, 4, 3);

        ctx.restore();
    }

    drawFallbackPlayer(ctx, p) {
        const cx = p.x + p.w/2;
        ctx.fillStyle = '#667eea';
        bRR(ctx, p.x+5, p.y+p.h*0.38, p.w-10, p.h*0.40, 4); ctx.fill();
        ctx.fillStyle = '#FFD0A8';
        ctx.beginPath(); ctx.arc(cx, p.y+p.h*0.2, p.w*0.30, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(cx+5, p.y+p.h*0.18, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#3d5af1';
        ctx.fillRect(p.x+5, p.y+p.h*0.77, p.w/2-7, p.h*0.23);
        ctx.fillRect(p.x+p.w/2+2, p.y+p.h*0.77, p.w/2-7, p.h*0.23);
    }

    drawEnemies() {
        for (const e of this.enemies) { if (!e.alive) continue; this.drawEnemy(e); }
    }

    drawEnemy(e) {
        const ctx = this.ctx;
        const cx = e.x + e.w / 2;
        const pDir = (this.player && this.player.x + this.player.w / 2 > cx) ? 1 : -1;

        ctx.save();
        // Flip enemy to face player
        if (pDir < 0) {
            ctx.translate(cx, 0);
            ctx.scale(-1, 1);
            ctx.translate(-cx, 0);
        }

        // Draw avatar or fallback
        if (e.avatarImg) {
            ctx.drawImage(e.avatarImg, e.x - 1, e.y, e.w + 2, e.h - 4);
        } else {
            // Fallback blob monster
            const cy = e.y + e.h / 2, r = e.w / 2 - 1;
            ctx.fillStyle = e.color;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.1, r * 0.25, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + r * 0.3, cy - r * 0.1, r * 0.25, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(cx - r * 0.28, cy - r * 0.1, r * 0.12, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + r * 0.32, cy - r * 0.1, r * 0.12, 0, Math.PI * 2); ctx.fill();
        }

        // Gun
        ctx.fillStyle = '#444';
        ctx.fillRect(e.x + e.w - 2, e.y + Math.round(e.h * 0.33), 14, 5);
        ctx.fillStyle = '#222';
        ctx.fillRect(e.x + e.w + 10, e.y + Math.round(e.h * 0.33) + 1, 4, 3);

        ctx.restore();

        // Answer label — neutral dark background, player must calculate
        const ans = String(e.answer);
        ctx.font = 'bold 13px Arial';
        const tw = ctx.measureText(ans).width;
        const lw = tw + 16, lh = 22, lx = cx - lw / 2, ly = e.y - lh - 5;
        ctx.fillStyle = 'rgba(25,25,45,0.88)';
        bRR(ctx, lx, ly, lw, lh, 7); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(ans, cx, ly + lh - 6);
    }

    drawQuestion() {
        if (!this.player || this.questionsCompleted >= this.TOTAL_Q) return;
        const q = this.questions[this.currentQ];
        if (!q) return;
        const ctx = this.ctx, p = this.player, text = q.text;
        ctx.font = 'bold 15px Arial';
        const tw = ctx.measureText(text).width;
        const bw = tw+20, bh = 26;
        const bx = p.x+p.w/2-bw/2, by = p.y-bh-14;

        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.strokeStyle = '#667eea'; ctx.lineWidth = 2;
        bRR(ctx, bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.beginPath();
        ctx.moveTo(p.x+p.w/2-5, by+bh);
        ctx.lineTo(p.x+p.w/2,   by+bh+9);
        ctx.lineTo(p.x+p.w/2+5, by+bh);
        ctx.fill();

        ctx.fillStyle = '#333'; ctx.textAlign = 'center';
        ctx.fillText(text, p.x+p.w/2, by+bh-7);
    }

    drawPlayerBullets() {
        const ctx = this.ctx;
        for (const b of this.playerBullets) {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'rgba(255,200,0,0.32)';
            ctx.beginPath(); ctx.arc(b.x-b.vx*0.016, b.y, 4, 0, Math.PI*2); ctx.fill();
        }
    }

    drawEnemyBullets() {
        const ctx = this.ctx;
        ctx.fillStyle = '#ff4757';
        for (const b of this.enemyBullets) {
            ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill();
        }
    }

    drawShrapnel() {
        const ctx = this.ctx;
        for (const s of this.shrapnel) {
            ctx.globalAlpha = Math.min(1, s.life/1.2);
            ctx.fillStyle = s.color;
            ctx.save();
            ctx.translate(s.x, s.y); ctx.rotate(s.x*0.06);
            ctx.beginPath();
            ctx.moveTo(0,-s.r); ctx.lineTo(s.r*0.6, s.r*0.8); ctx.lineTo(-s.r*0.6, s.r*0.8);
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }

    drawParticles() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ── UI HELPERS ────────────────────────────────────────────────────────────

    updateLivesDisplay() {
        const el = document.getElementById('battle-lives');
        if (el) el.innerHTML = '❤️'.repeat(Math.max(0,this.lives)) + '🖤'.repeat(Math.max(0,3-this.lives));
    }
    updateQDisplay() {
        const el = document.getElementById('battle-q-count');
        if (el) el.textContent = this.questionsCompleted;
    }
    updateTimerDisplay() {
        const el = document.getElementById('battle-timer-display');
        if (el) el.textContent = this.timerRemaining + 's';
    }

    // ── END GAME ──────────────────────────────────────────────────────────────

    endGame(won) {
        if (this.gameOver) return;
        this.gameOver = true; this.isRunning = false;
        if (this.animFrame)    cancelAnimationFrame(this.animFrame);
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.controls = { left:false, right:false, jump:false, shoot:false };
        if (typeof app !== 'undefined')
            setTimeout(() => app.showBattleResults(this.questionsCompleted, this.TOTAL_Q, won), 420);
    }

    stopGame() {
        this.gameOver = true; this.isRunning = false;
        if (this.animFrame)    cancelAnimationFrame(this.animFrame);
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.controls = { left:false, right:false, jump:false, shoot:false };
    }
}

// ── Module-level helpers (prefixed to avoid collisions) ────────────────────────

function bShuffle(arr) {
    for (let i = arr.length-1; i > 0; i--) {
        const j = Math.floor(Math.random()*(i+1));
        [arr[i],arr[j]] = [arr[j],arr[i]];
    }
    return arr;
}

function bRR(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);   ctx.quadraticCurveTo(x+w, y,   x+w, y+r);
    ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);   ctx.quadraticCurveTo(x,   y+h, x,   y+h-r);
    ctx.lineTo(x, y+r);     ctx.quadraticCurveTo(x,   y,   x+r, y);
    ctx.closePath();
}

const battleGame = new BattleGameClass();
