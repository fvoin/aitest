// Find Friends — Mario-style side-scrolling platformer
class BattleGameClass {
    constructor() {
        this.GRAVITY      = 880;
        this.PLAYER_SPEED = 200;
        this.JUMP_VEL     = -440;
        this.TOTAL_Q      = 3;
        this.GH           = 110;  // ground depth below ground line

        this.canvas = null; this.ctx = null;
        this.animFrame = null; this.isRunning = false;
        this.lastTime = 0; this.W = 0; this.H = 0;

        this.lives = 3; this.questionsCompleted = 0; this.currentQ = 0;
        this.grade = '1'; this.timerTotal = 0; this.timerRemaining = 0;
        this.timerInterval = null; this.gameOver = false;

        this.player     = null;
        this.platforms  = [];   // floating platforms only
        this.enemies    = [];
        this.shrapnel   = [];
        this.particles  = [];
        this.scrollX    = 0;
        this.levelEndX  = 0;

        // Heightmap terrain
        this.groundPoints = []; // [{x, y}] sorted by x
        this.GROUND_STEP  = 40; // x distance between height samples

        this.questions  = [];
        this.controls   = { left:false, right:false, jump:false };
        this.jumpConsumed = false;
        this.airJumpUsed = false;
        this.flipAngle = 0;

        this.avatarImg    = null;
        this.avatarLoaded = false;
        this.savedFriends = [];
        this.COLORS = ['#ff6b6b','#ff9f43','#26de81','#45aaf2','#fd79a8','#a29bfe','#00cec9','#e17055'];
    }

    // ── INIT ──────────────────────────────────────────────────────────────────

    async init() {
        this.canvas = document.getElementById('battle-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.setupControls();
        window.addEventListener('resize', () => { if (this.isRunning) this.resizeCanvas(); });
        if (screen.orientation) screen.orientation.addEventListener('change', () => { if (this.isRunning) setTimeout(() => this.resizeCanvas(), 200); });
    }

    svgToImage(svg, callback) {
        var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        var img = new Image();
        img.onload  = function() { callback(img); };
        img.onerror = function() { callback(null); };
        img.src = url;
    }

    async loadAvatar() {
        this.avatarLoaded = false; this.avatarImg = null;
        if (typeof AvatarManager === 'undefined') return;
        try {
            var svg = AvatarManager.getSVG(80, false);
            await new Promise(function(resolve) {
                this.svgToImage(svg, function(img) {
                    if (img) { this.avatarImg = img; this.avatarLoaded = true; }
                    resolve();
                }.bind(this));
            }.bind(this));
        } catch(e) {}
    }

    loadRandomAvatarForEnemy(enemy) {
        if (typeof AvatarManager === 'undefined') return;
        var rnd = function(arr) { return arr[Math.floor(Math.random() * arr.length)]; };
        var saved = {};
        for (var k in AvatarManager.current) saved[k] = AvatarManager.current[k];
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
        var svg = AvatarManager.getSVG(80, false);
        AvatarManager.current = saved;
        this.svgToImage(svg, function(img) { if (img) enemy.avatarImg = img; });
    }

    setupControls() {
        var map = { left:'battle-left-btn', right:'battle-right-btn', jump:'battle-jump-btn' };
        for (var key in map) {
            var id = map[key];
            var el = document.getElementById(id);
            if (!el) continue;
            (function(k, btn) {
                ['touchstart','mousedown'].forEach(function(ev) {
                    btn.addEventListener(ev, function(e) { e.preventDefault(); this.controls[k] = true; }.bind(this), { passive:false });
                }.bind(this));
                ['touchend','touchcancel','mouseup'].forEach(function(ev) {
                    btn.addEventListener(ev, function() { this.controls[k] = false; }.bind(this));
                }.bind(this));
            }.bind(this))(key, el);
        }
        document.addEventListener('keydown', function(e) {
            if (e.key==='ArrowLeft'||e.key==='a') this.controls.left = true;
            if (e.key==='ArrowRight'||e.key==='d') this.controls.right = true;
            if ((e.key==='ArrowUp'||e.key==='w'||e.key===' ')&&!e.repeat) this.controls.jump = true;
        }.bind(this));
        document.addEventListener('keyup', function(e) {
            if (e.key==='ArrowLeft'||e.key==='a') this.controls.left = false;
            if (e.key==='ArrowRight'||e.key==='d') this.controls.right = false;
            if (e.key==='ArrowUp'||e.key==='w'||e.key===' ') this.controls.jump = false;
        }.bind(this));
    }

    // ── CANVAS ────────────────────────────────────────────────────────────────

    resizeCanvas() {
        var wrap = document.getElementById('battle-canvas-wrap');
        if (!wrap) return;
        var W = wrap.clientWidth;
        var H = wrap.clientHeight;
        this.canvas.width = W;
        this.canvas.height = H;
        this.W = W;
        this.H = H;
    }

    // ── QUESTIONS ─────────────────────────────────────────────────────────────

    makeQuestion() {
        var g = parseInt(this.grade);
        var ri = function(a,b) { return Math.floor(Math.random()*(b-a+1))+a; };
        var text, answer;
        if (g===1) { var a=ri(1,9),b=ri(1,9); text=a+' + '+b; answer=a+b; }
        else if (g===2) {
            if (Math.random()<0.5) { var a2=ri(5,15),b2=ri(1,10); text=a2+' + '+b2; answer=a2+b2; }
            else { var a3=ri(8,20),b3=ri(1,a3-1); text=a3+' − '+b3; answer=a3-b3; }
        } else if (g===3) { var a4=ri(2,10),b4=ri(2,10); text=a4+' × '+b4; answer=a4*b4; }
        else if (g===4) {
            var t=ri(0,2);
            if (t===0){var a5=ri(20,80),b5=ri(10,50);text=a5+' + '+b5;answer=a5+b5;}
            else if(t===1){var a6=ri(30,100),b6=ri(5,25);text=a6+' − '+b6;answer=a6-b6;}
            else{var a7=ri(3,12),b7=ri(3,12);text=a7+' × '+b7;answer=a7*b7;}
        } else { var a8=ri(4,15),b8=ri(4,15); text=a8+' × '+b8; answer=a8*b8; }
        return { text: text, answer: answer, wrongs: this.makeWrongs(answer, 6) };
    }

    makeWrongs(correct, n) {
        var set = new Set();
        var spread = Math.max(5, Math.ceil(Math.abs(correct)*0.28));
        var tries = 0;
        while (set.size < n && tries++ < 400) {
            var d = Math.floor(Math.random()*spread*2)-spread;
            if (d!==0) { var w=correct+d; if (w>0&&w!==correct) set.add(w); }
        }
        var arr = []; set.forEach(function(v){ arr.push(v); }); return arr;
    }

    randomWrongAnswer() {
        var q = this.questions[this.currentQ];
        return q.wrongs[Math.floor(Math.random() * q.wrongs.length)];
    }

    // ── HEIGHTMAP TERRAIN ────────────────────────────────────────────────────

    getBaseGroundY() { return this.H - this.GH; }

    generateHeightmap(fromX, toX) {
        var baseY = this.getBaseGroundY();
        var step = this.GROUND_STEP;
        // Start from last point or beginning
        var startX = fromX;
        if (this.groundPoints.length > 0) {
            startX = this.groundPoints[this.groundPoints.length - 1].x + step;
        } else {
            // First few points are flat for player spawn
            for (var fx = fromX; fx < fromX + 200; fx += step) {
                this.groundPoints.push({ x: fx, y: baseY });
            }
            startX = fx;
        }
        for (var x = startX; x <= toX; x += step) {
            // Smooth hills using layered sine waves
            var hill = Math.sin(x * 0.005) * 40
                     + Math.sin(x * 0.013 + 2) * 25
                     + Math.sin(x * 0.031 + 5) * 15;
            this.groundPoints.push({ x: x, y: baseY - hill });
        }
    }

    getGroundYAt(worldX) {
        var pts = this.groundPoints;
        if (pts.length === 0) return this.getBaseGroundY();
        if (worldX <= pts[0].x) return pts[0].y;
        if (worldX >= pts[pts.length-1].x) return pts[pts.length-1].y;
        // Binary search for segment
        var lo = 0, hi = pts.length - 1;
        while (lo < hi - 1) {
            var mid = (lo + hi) >> 1;
            if (pts[mid].x <= worldX) lo = mid; else hi = mid;
        }
        var a = pts[lo], b = pts[hi];
        var t = (worldX - a.x) / (b.x - a.x);
        return a.y + (b.y - a.y) * t;
    }

    getGroundSlopeAt(worldX) {
        var dx = 8;
        var y1 = this.getGroundYAt(worldX - dx);
        var y2 = this.getGroundYAt(worldX + dx);
        return Math.atan2(y2 - y1, dx * 2);
    }

    generateTerrain(fromX, toX) {
        // Generate heightmap
        this.generateHeightmap(fromX, toX);

        // Floating platforms
        var x = fromX + 200;
        while (x < toX) {
            if (Math.random() < 0.35) {
                var gy = this.getGroundYAt(x);
                var pw = 120 + Math.random() * 120;
                var py = gy - 120 - Math.random() * 100;
                this.platforms.push({ x: x, y: py, w: pw, h: 21, isGround: false });
            }
            x += 300 + Math.random() * 300;
        }
        return toX;
    }

    spawnEnemiesInRange(fromX, toX) {
        var q = this.questions[this.currentQ];
        if (!q) return;
        var x = fromX + 120 + Math.random() * 100;
        var correctPlaced = false;

        while (x < toX - 50) {
            var gy = this.getGroundYAt(x);
            var makeCorrect = !correctPlaced && (x > toX - 300 || Math.random() < 0.25);
            var answer = makeCorrect ? q.answer : this.randomWrongAnswer();
            this.enemies.push(this.createEnemy({ x: x, y: gy }, answer, makeCorrect));
            if (makeCorrect) correctPlaced = true;
            x += 160 + Math.random() * 220;
        }

        if (!correctPlaced) {
            var bx = fromX + 200 + Math.random() * (toX - fromX - 400);
            var bgy = this.getGroundYAt(bx);
            this.enemies.push(this.createEnemy({ x: bx, y: bgy }, q.answer, true));
        }
    }

    findSurfaceAt(worldX) {
        return { y: this.getGroundYAt(worldX) };
    }

    extendLevel() {
        var aheadNeeded = this.scrollX + this.W * 3;
        if (this.levelEndX < aheadNeeded) {
            var oldEnd = this.levelEndX;
            this.levelEndX = this.generateTerrain(this.levelEndX, aheadNeeded);
            this.spawnEnemiesInRange(oldEnd, this.levelEndX);
        }
    }

    cleanupLevel() {
        var cutoff = this.scrollX - this.W;
        this.platforms = this.platforms.filter(function(p) { return p.x + p.w > cutoff; });
        this.enemies   = this.enemies.filter(function(e) { return e.x + e.w > cutoff - 100; });
        this.shrapnel  = this.shrapnel.filter(function(s) { return s.x > cutoff - 200; });
        // Clean old ground points
        while (this.groundPoints.length > 2 && this.groundPoints[1].x < cutoff) {
            this.groundPoints.shift();
        }
    }

    // ── ENEMY ─────────────────────────────────────────────────────────────────

    createEnemy(sp, answer, isCorrect) {
        var EW = 63, EH = 84;
        var r = Math.random();
        var behavior, speed, patrolRange, jumpTimer;
        if (r < 0.15)       { behavior = 'stand';     speed = 0;   patrolRange = 0;   }
        else if (r < 0.30)  { behavior = 'walk';      speed = 35 + Math.random()*20;  patrolRange = 9999; }
        else if (r < 0.45)  { behavior = 'slow';      speed = 20 + Math.random()*15;  patrolRange = 60;  }
        else if (r < 0.60)  { behavior = 'run';       speed = 90 + Math.random()*40;  patrolRange = 120; }
        else if (r < 0.75)  { behavior = 'jumper';    speed = 30 + Math.random()*20;  patrolRange = 60;  jumpTimer = 1 + Math.random()*2; }
        else                { behavior = 'patrol';    speed = 45;  patrolRange = 75;  }
        var dir = Math.random()<0.5 ? 1 : -1;
        if (behavior === 'walk') dir = 1;
        var enemy = {
            x: sp.x - EW/2, y: sp.y - EH,
            w: EW, h: EH, vy: 0,
            answer: answer, isCorrect: isCorrect,
            color: this.COLORS[Math.floor(Math.random()*this.COLORS.length)],
            avatarImg: null, alive: true,
            behavior: behavior,
            speed: speed,
            patrolCX: sp.x, patrolRange: patrolRange,
            patrolDir: dir,
            patrolTimer: Math.random()*2+1,
            jumpTimer: jumpTimer || 0,
            onGround: false,
            walkPhase: Math.random() * Math.PI * 2,
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
        this.groundPoints = [];
        this.savedFriends = [];
        this.flyingFriends = [];
        this.gameOver = false; this.jumpConsumed = false;
        this.scrollX = 0; this.levelEndX = 0;

        this.questions = Array.from({ length: this.TOTAL_Q }, () => this.makeQuestion());

        await this.loadAvatar();
        await new Promise(function(r) { requestAnimationFrame(function() { requestAnimationFrame(r); }); });
        this.resizeCanvas();

        this.levelEndX = this.generateTerrain(0, this.W * 4);
        this.spawnEnemiesInRange(this.W * 0.5, this.levelEndX);

        var startY = this.getGroundYAt(80);
        this.player = {
            x: 80, y: startY - 87,
            w: 54, h: 87, vx: 0, vy: 0,
            onGround: true, facingRight: true, invTimer: 0,
            prevY: startY - 87, walkPhase: 0,
        };
        this.airJumpUsed = false;
        this.flipAngle = 0;

        if (this.timerInterval) clearInterval(this.timerInterval);
        if (timer > 0) {
            this.updateTimerDisplay();
            document.getElementById('battle-timer-display').style.display = 'block';
            this.timerInterval = setInterval(function() {
                this.timerRemaining--;
                this.updateTimerDisplay();
                if (this.timerRemaining <= 0) { clearInterval(this.timerInterval); this.endGame(false); }
            }.bind(this), 1000);
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
        var dt = Math.min((ts - this.lastTime)/1000, 0.05);
        this.lastTime = ts;
        this.update(dt);
        this.render();
        this.animFrame = requestAnimationFrame(function(t) { this.loop(t); }.bind(this));
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

        var targetX = Math.max(0, this.player.x - this.W * 0.35);
        this.scrollX += (targetX - this.scrollX) * 0.1;
    }

    // ── PLAYER ────────────────────────────────────────────────────────────────

    updatePlayer(dt) {
        var p = this.player; if (!p) return;
        p.prevY = p.y;

        if      (this.controls.left)  { p.vx = -this.PLAYER_SPEED; p.facingRight = false; }
        else if (this.controls.right) { p.vx =  this.PLAYER_SPEED; p.facingRight = true;  }
        else p.vx *= 0.6;

        if (this.controls.jump && !this.jumpConsumed) {
            if (p.onGround) {
                p.vy = this.JUMP_VEL;
                this.jumpConsumed = true;
                this.airJumpUsed = false;
                this.flipAngle = 0;
            } else if (!this.airJumpUsed) {
                p.vy = this.JUMP_VEL * 0.85;
                this.airJumpUsed = true;
                this.jumpConsumed = true;
                this.flipAngle = 0.01;
            }
        }
        if (!this.controls.jump) this.jumpConsumed = false;

        if (this.flipAngle > 0 && this.flipAngle < Math.PI * 2) {
            this.flipAngle += 14 * dt;
            if (this.flipAngle >= Math.PI * 2) this.flipAngle = 0;
        }

        p.vy += this.GRAVITY * dt;
        p.x  += p.vx * dt;
        p.y  += p.vy * dt;
        if (p.x < 0) p.x = 0;

        // Ground collision via heightmap
        p.onGround = false;
        var groundY = this.getGroundYAt(p.x + p.w/2);
        if (p.vy >= 0 && p.y + p.h >= groundY) {
            p.y = groundY - p.h;
            p.vy = 0;
            p.onGround = true;
            this.airJumpUsed = false;
            this.flipAngle = 0;
        }

        // Floating platform collision
        for (var i = 0; i < this.platforms.length; i++) {
            var pl = this.platforms[i];
            if (p.vy >= 0 && p.x+p.w > pl.x && p.x < pl.x+pl.w &&
                p.y+p.h >= pl.y && p.y+p.h - p.vy*dt <= pl.y + 8) {
                p.y = pl.y - p.h; p.vy = 0; p.onGround = true;
                this.airJumpUsed = false; this.flipAngle = 0;
            }
        }

        // Fell into pit — respawn without penalty
        if (p.y > this.H + 40) {
            var rx = p.x + 60;
            var gy = this.getGroundYAt(rx);
            p.x = rx; p.y = gy - p.h; p.vy = 0;
        }

        if (p.invTimer > 0) p.invTimer -= dt;

        // Walk animation phase
        if (p.onGround && Math.abs(p.vx) > 20) {
            p.walkPhase += Math.abs(p.vx) * dt * 0.08;
        } else if (p.onGround) {
            p.walkPhase = 0;
        }
    }

    // ── ENEMIES ───────────────────────────────────────────────────────────────

    updateEnemies(dt) {
        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            if (!e.alive) continue;

            if (e.behavior === 'stand') {
                // no horizontal movement
            } else if (e.behavior === 'walk') {
                e.x += e.patrolDir * e.speed * dt;
            } else if (e.behavior === 'patrol' || e.behavior === 'slow' || e.behavior === 'run') {
                e.patrolTimer -= dt;
                if (e.patrolTimer <= 0) { e.patrolDir *= -1; e.patrolTimer = Math.random()*2+1; }
                e.x += e.patrolDir * e.speed * dt;
                var minX = e.patrolCX - e.patrolRange;
                var maxX = e.patrolCX + e.patrolRange;
                if (e.x + e.w/2 < minX) { e.x = minX - e.w/2; e.patrolDir = 1; }
                if (e.x + e.w/2 > maxX) { e.x = maxX - e.w/2; e.patrolDir = -1; }
            } else if (e.behavior === 'jumper') {
                e.patrolTimer -= dt;
                if (e.patrolTimer <= 0) { e.patrolDir *= -1; e.patrolTimer = Math.random()*2+1; }
                e.x += e.patrolDir * e.speed * dt;
                var jminX = e.patrolCX - e.patrolRange;
                var jmaxX = e.patrolCX + e.patrolRange;
                if (e.x + e.w/2 < jminX) { e.x = jminX - e.w/2; e.patrolDir = 1; }
                if (e.x + e.w/2 > jmaxX) { e.x = jmaxX - e.w/2; e.patrolDir = -1; }
                e.jumpTimer -= dt;
                if (e.jumpTimer <= 0 && e.onGround) {
                    e.vy = this.JUMP_VEL * 0.6;
                    e.jumpTimer = 1.5 + Math.random() * 2;
                }
            }

            if (e.speed > 0) e.walkPhase += e.speed * dt * 0.12;

            // Gravity
            e.vy += this.GRAVITY * dt;
            e.y  += e.vy * dt;

            // Ground collision via heightmap
            e.onGround = false;
            var eGroundY = this.getGroundYAt(e.x + e.w/2);
            if (e.vy >= 0 && e.y + e.h >= eGroundY) {
                e.y = eGroundY - e.h;
                e.vy = 0;
                e.onGround = true;
            }

            // Floating platform collision
            for (var j = 0; j < this.platforms.length; j++) {
                var pl = this.platforms[j];
                if (e.vy >= 0 && e.x+e.w > pl.x && e.x < pl.x+pl.w &&
                    e.y+e.h >= pl.y && e.y+e.h - e.vy*dt <= pl.y+8) {
                    e.y = pl.y - e.h; e.vy = 0; e.onGround = true;
                }
            }

            if (e.y > this.H + 80) e.alive = false;
        }
    }

    updateShrapnel(dt) {
        for (var i = 0; i < this.shrapnel.length; i++) {
            var s = this.shrapnel[i];
            s.x+=s.vx*dt; s.y+=s.vy*dt;
            s.vy+=this.GRAVITY*0.2*dt; s.vx*=0.995; s.life-=dt;
        }
        this.shrapnel = this.shrapnel.filter(function(s) { return s.life > 0; });
    }

    updateParticles(dt) {
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt; p.alpha=p.life/p.maxLife;
        }
        this.particles = this.particles.filter(function(p) { return p.life > 0; });
    }

    updateFlyingFriends(dt) {
        for (var i = 0; i < this.flyingFriends.length; i++) {
            var f = this.flyingFriends[i];
            f.t += dt * 1.8;
            if (f.t >= 1) { f.t = 1; f.done = true; }
            var t = f.t;
            var ease = 1 - Math.pow(1 - t, 3);
            f.curX = f.startX + (f.targetX - f.startX) * ease;
            f.curY = f.startY + (f.targetY - f.startY) * ease - Math.sin(t * Math.PI) * 60;
            f.curScale = 1 - ease * 0.4;
            f.curAlpha = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2 * 0.3;
        }
        var justLanded = this.flyingFriends.filter(function(f) { return f.done; });
        this.flyingFriends = this.flyingFriends.filter(function(f) { return !f.done; });
        for (var j = 0; j < justLanded.length; j++) {
            this.savedFriends.push(justLanded[j].img);
        }
    }

    // ── COLLISION ─────────────────────────────────────────────────────────────

    checkCollisions() {
        var p = this.player;
        if (!p || p.invTimer > 0) return;

        var px = p.x + 5, py = p.y + 3, pw = p.w - 10, ph = p.h - 3;

        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            if (!e.alive) continue;
            var ex = e.x + 5, ey = e.y + 4, ew = e.w - 10, eh = e.h - 4;

            if (!(px+pw > ex && px < ex+ew && py+ph > ey && py < ey+eh)) continue;

            var prevFeetY = p.prevY + p.h;
            if (p.vy > 0 && prevFeetY <= e.y + e.h * 0.35) {
                p.vy = this.JUMP_VEL * 0.55;
                if (e.isCorrect) {
                    this.onStompFriend(e);
                } else {
                    e.alive = false;
                    this.onStompWrong(e);
                }
            } else {
                if (e.isCorrect) {
                    this.onSaveFriend(e);
                    p.vy = this.JUMP_VEL * 0.25;
                } else {
                    this.playerHit();
                    p.vy = this.JUMP_VEL * 0.35;
                    p.vx = (p.x < e.x) ? -280 : 280;
                }
            }
            break;
        }

        this.enemies = this.enemies.filter(function(e) { return e.alive; });
    }

    onStompFriend(e) {
        e.alive = false;
        this.spawnParticles(e.x+e.w/2, e.y+e.h/2, '#ff3300', '#ff6600', 20);
        this.playerHit();
    }

    onSaveFriend(e) {
        e.alive = false;
        this.spawnParticles(e.x+e.w/2, e.y+e.h/2, '#4CAF50', '#FFD700', 20);
        var hudIdx = this.savedFriends.length + this.flyingFriends.length;
        var targetX = 10 + hudIdx * 56;
        var targetY = this.getHUDTopY();
        this.flyingFriends.push({
            img: e.avatarImg,
            startX: e.x - this.scrollX, startY: e.y,
            targetX: targetX, targetY: targetY,
            curX: e.x - this.scrollX, curY: e.y,
            curScale: 1, curAlpha: 1, t: 0, done: false,
        });
        this.questionsCompleted++;
        if (this.questionsCompleted >= this.TOTAL_Q) {
            setTimeout(function() { this.endGame(true); }.bind(this), 600);
            return;
        }
        this.currentQ++;
        for (var i = 0; i < this.enemies.length; i++) {
            var en = this.enemies[i];
            if (en.alive && en.isCorrect) {
                en.isCorrect = false;
                en.answer = this.randomWrongAnswer();
            }
        }
    }

    onStompWrong(e) {
        var cx = e.x+e.w/2, cy = e.y+e.h/2;
        this.spawnParticles(cx, cy, '#ff9500', '#ffcc00', 45);
        this.spawnParticles(cx, cy, '#ff3300', '#ff6600', 30);
        this.spawnShrapnel(cx, cy, 30);
    }

    spawnParticles(cx, cy, c1, c2, n) {
        for (var i=0; i<n; i++) {
            var ang=(i/n)*Math.PI*2+Math.random()*0.5;
            var spd=80+Math.random()*150;
            var ml=0.5+Math.random()*0.3;
            this.particles.push({
                x:cx,y:cy,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd-40,
                r:3+Math.random()*4,color:Math.random()<0.5?c1:c2,
                life:ml,maxLife:ml,alpha:1
            });
        }
    }

    spawnShrapnel(cx, cy, n) {
        for (var i=0; i<n; i++) {
            var ang=Math.random()*Math.PI*2;
            var spd=350+Math.random()*500;
            this.shrapnel.push({
                x:cx,y:cy,
                vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd-200,
                r:4+Math.random()*7,
                color:'hsl('+(10+Math.random()*40)+',95%,'+(45+Math.random()*20)+'%)',
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
        var ctx = this.ctx; if (!ctx) return;
        ctx.clearRect(0, 0, this.W, this.H);
        this.drawBG();
        ctx.save();
        ctx.translate(-this.scrollX, 0);
        this.drawGround();
        this.drawPlatforms();
        this.drawShrapnelWorld();
        this.drawEnemies();
        this.drawPlayer();
        this.drawParticlesWorld();
        this.drawQuestion();
        ctx.restore();
        this.drawFriendsHUD();
        this.drawFlyingFriends();
    }

    drawBG() {
        var ctx = this.ctx;
        var g = ctx.createLinearGradient(0,0,0,this.H);
        g.addColorStop(0,'#87CEEB'); g.addColorStop(1,'#cde9ff');
        ctx.fillStyle = g; ctx.fillRect(0,0,this.W,this.H);
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        var ox = this.scrollX * 0.15;
        for (var i = 0; i < 6; i++) {
            var cx = (i * 220 + 80 - ox % 1320 + 1320) % 1320 - 60;
            var cy = 20 + (i%3) * 25 + Math.sin(i*1.7)*15;
            var sz = 36 + (i%3)*12;
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

    drawGround() {
        var ctx = this.ctx;
        var pts = this.groundPoints;
        if (pts.length < 2) return;
        var lo = this.scrollX - 50;
        var hi = this.scrollX + this.W + 50;
        var bottom = this.H + 20;

        // Find visible range
        var startIdx = 0, endIdx = pts.length - 1;
        for (var i = 0; i < pts.length; i++) {
            if (pts[i].x >= lo) { startIdx = Math.max(0, i - 1); break; }
        }
        for (var j = pts.length - 1; j >= 0; j--) {
            if (pts[j].x <= hi) { endIdx = Math.min(pts.length - 1, j + 1); break; }
        }

        // Draw dirt fill
        ctx.beginPath();
        ctx.moveTo(pts[startIdx].x, bottom);
        for (var k = startIdx; k <= endIdx; k++) {
            ctx.lineTo(pts[k].x, pts[k].y);
        }
        ctx.lineTo(pts[endIdx].x, bottom);
        ctx.closePath();
        ctx.fillStyle = '#7a5230';
        ctx.fill();

        // Draw grass strip on top
        ctx.beginPath();
        for (var m = startIdx; m <= endIdx; m++) {
            if (m === startIdx) ctx.moveTo(pts[m].x, pts[m].y);
            else ctx.lineTo(pts[m].x, pts[m].y);
        }
        ctx.strokeStyle = '#5a9e6e';
        ctx.lineWidth = 16;
        ctx.stroke();

        // Grass tufts
        ctx.fillStyle = '#3d7a50';
        for (var n = startIdx; n <= endIdx; n++) {
            if (n % 2 === 0) {
                ctx.fillRect(pts[n].x - 2, pts[n].y - 8, 4, 10);
            }
        }
    }

    drawPlatforms() {
        var ctx = this.ctx;
        var lo = this.scrollX - 50, hi = this.scrollX + this.W + 50;
        for (var i = 0; i < this.platforms.length; i++) {
            var pl = this.platforms[i];
            if (pl.x + pl.w < lo || pl.x > hi) continue;
            ctx.fillStyle = '#8B6914';
            bRR(ctx, pl.x, pl.y, pl.w, pl.h, 7); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.fillRect(pl.x+5, pl.y+3, pl.w-10, 4);
        }
    }

    // ── WALK ANIMATION (split-body) ──────────────────────────────────────────

    drawAnimatedSprite(ctx, img, x, y, w, h, walkPhase, slope) {
        if (!img) return;
        var swing = Math.sin(walkPhase) * 0.15; // rotation amount
        var halfH = h / 2;
        var cx = x + w/2;

        // Lean into slope
        ctx.save();
        ctx.translate(cx, y + h);
        ctx.rotate(slope * 0.5);
        ctx.translate(-cx, -(y + h));

        // Upper body — slight counter-swing
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - 10, y - 10, w + 20, halfH + 10);
        ctx.clip();
        ctx.translate(cx, y + halfH);
        ctx.rotate(-swing * 0.6);
        ctx.translate(-cx, -(y + halfH));
        ctx.drawImage(img, x-1, y, w+2, h-4);
        ctx.restore();

        // Lower body — swing legs
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - 10, y + halfH, w + 20, halfH + 10);
        ctx.clip();
        ctx.translate(cx, y + halfH);
        ctx.rotate(swing);
        ctx.translate(-cx, -(y + halfH));
        ctx.drawImage(img, x-1, y, w+2, h-4);
        ctx.restore();

        ctx.restore();
    }

    drawPlayer() {
        var ctx = this.ctx, p = this.player; if (!p) return;
        if (p.invTimer > 0 && Math.floor(p.invTimer*9)%2===0) return;
        ctx.save();
        var cx = p.x + p.w/2, cy = p.y + p.h/2;
        if (this.flipAngle > 0) {
            ctx.translate(cx, cy);
            ctx.rotate(this.flipAngle);
            ctx.translate(-cx, -cy);
        }
        if (!p.facingRight) {
            ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0);
        }
        var slope = p.onGround ? this.getGroundSlopeAt(p.x + p.w/2) : 0;
        if (this.avatarLoaded && this.avatarImg) {
            this.drawAnimatedSprite(ctx, this.avatarImg, p.x, p.y, p.w, p.h, p.walkPhase, slope);
        } else {
            this.drawFallback(ctx, p.x, p.y, p.w, p.h, '#667eea');
        }
        ctx.restore();
    }

    drawFallback(ctx, x, y, w, h, col) {
        var cx = x+w/2;
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
        var ctx = this.ctx;
        var lo = this.scrollX-60, hi = this.scrollX+this.W+60;
        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            if (!e.alive || e.x+e.w < lo || e.x > hi) continue;
            var ecx = e.x+e.w/2;

            ctx.save();
            var pDir = (this.player && this.player.x+this.player.w/2 > ecx) ? 1 : -1;
            if (pDir<0) { ctx.translate(ecx,0); ctx.scale(-1,1); ctx.translate(-ecx,0); }

            var eslope = e.onGround ? this.getGroundSlopeAt(ecx) : 0;
            if (e.avatarImg) {
                this.drawAnimatedSprite(ctx, e.avatarImg, e.x, e.y, e.w, e.h, e.walkPhase || 0, eslope);
            } else {
                this.drawFallback(ctx, e.x, e.y, e.w, e.h, e.color);
            }
            ctx.restore();

            // Answer label
            var ans = String(e.answer);
            ctx.font = 'bold 19px Arial';
            var tw = ctx.measureText(ans).width;
            var lw=tw+22, lh=30, lx=ecx-lw/2, ly=e.y-lh-7;
            ctx.fillStyle = 'rgba(25,25,45,0.88)';
            bRR(ctx, lx, ly, lw, lh, 9); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
            ctx.fillText(ans, ecx, ly+lh-8);
        }
    }

    drawQuestion() {
        if (!this.player || this.questionsCompleted >= this.TOTAL_Q) return;
        var q = this.questions[this.currentQ]; if (!q) return;
        var ctx = this.ctx, p = this.player, text = q.text;
        ctx.font = 'bold 22px Arial';
        var tw = ctx.measureText(text).width;
        var bw=tw+28, bh=36;
        var bx=p.x+p.w/2-bw/2, by=p.y-bh-18;
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.strokeStyle = '#667eea'; ctx.lineWidth = 2;
        bRR(ctx, bx, by, bw, bh, 10); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.beginPath();
        ctx.moveTo(p.x+p.w/2-7, by+bh);
        ctx.lineTo(p.x+p.w/2, by+bh+12);
        ctx.lineTo(p.x+p.w/2+7, by+bh);
        ctx.fill();
        ctx.fillStyle = '#333'; ctx.textAlign = 'center';
        ctx.fillText(text, p.x+p.w/2, by+bh-7);
    }

    drawShrapnelWorld() {
        var ctx = this.ctx;
        for (var i = 0; i < this.shrapnel.length; i++) {
            var s = this.shrapnel[i];
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
        var ctx = this.ctx;
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    getHUDTopY() {
        var hdr = document.getElementById('battle-header');
        return (hdr ? hdr.offsetHeight : 40) + 6;
    }

    drawFriendsHUD() {
        var ctx = this.ctx;
        var size = 48;
        var topY = this.getHUDTopY();
        for (var i = 0; i < this.savedFriends.length; i++) {
            var x = 10 + i * 56;
            ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.beginPath(); ctx.arc(x + size/2, topY + size/2, size/2 + 3, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#4CAF50'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x + size/2, topY + size/2, size/2 + 3, 0, Math.PI*2); ctx.stroke();
            if (this.savedFriends[i]) {
                ctx.drawImage(this.savedFriends[i], x, topY, size, size);
            }
        }
        for (var j = this.savedFriends.length; j < this.TOTAL_Q; j++) {
            var x2 = 10 + j * 56;
            ctx.fillStyle = 'rgba(200, 200, 200, 0.25)';
            ctx.beginPath(); ctx.arc(x2 + size/2, topY + size/2, size/2 + 3, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x2 + size/2, topY + size/2, size/2 + 3, 0, Math.PI*2); ctx.stroke();
            ctx.fillStyle = 'rgba(150, 150, 150, 0.6)';
            ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
            ctx.fillText('?', x2 + size/2, topY + size/2 + 8);
        }
    }

    drawFlyingFriends() {
        var ctx = this.ctx;
        var size = 48;
        for (var i = 0; i < this.flyingFriends.length; i++) {
            var f = this.flyingFriends[i];
            ctx.save();
            ctx.globalAlpha = f.curAlpha;
            var s = f.curScale;
            var drawSize = size * s;
            if (f.img) {
                ctx.drawImage(f.img, f.curX - drawSize/2, f.curY - drawSize/2, drawSize, drawSize);
            }
            ctx.restore();
        }
    }

    // ── UI ────────────────────────────────────────────────────────────────────

    updateLivesDisplay() {
        var el = document.getElementById('battle-lives');
        if (el) el.innerHTML = '❤️'.repeat(Math.max(0,this.lives))+'🖤'.repeat(Math.max(0,3-this.lives));
    }
    updateTimerDisplay() {
        var el = document.getElementById('battle-timer-display');
        if (el) el.textContent = this.timerRemaining+'s';
    }

    endGame(won) {
        if (this.gameOver) return;
        this.gameOver = true; this.isRunning = false;
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.controls = { left:false, right:false, jump:false };
        if (typeof app !== 'undefined')
            setTimeout(function() { app.showBattleResults(this.questionsCompleted, this.TOTAL_Q, won); }.bind(this), 420);
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
    for (var i=arr.length-1;i>0;i--) { var j=Math.floor(Math.random()*(i+1)); var t=arr[i]; arr[i]=arr[j]; arr[j]=t; }
    return arr;
}
function bRR(ctx,x,y,w,h,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
var battleGame = new BattleGameClass();
