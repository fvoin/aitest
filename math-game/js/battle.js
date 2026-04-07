// Find Friends — Mario-style side-scrolling platformer
class BattleGameClass {
    constructor() {
        this.GRAVITY      = 880;
        this.PLAYER_SPEED = 200;
        this.JUMP_VEL     = -550;
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

        // Boss fight state
        this.bossPhase    = false;
        this.boss         = null;  // { x, y, hp, tentacles[], question }
        this.bossIntroTimer = 0;
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
        var dx = 30;
        var y1 = this.getGroundYAt(worldX - dx);
        var y2 = this.getGroundYAt(worldX + dx);
        // Clamp to avoid wild rotation at gap edges
        var raw = Math.atan2(y2 - y1, dx * 2);
        if (raw > 0.4) raw = 0.4;
        if (raw < -0.4) raw = -0.4;
        return raw;
    }

    generateTerrain(fromX, toX) {
        // Generate heightmap
        this.generateHeightmap(fromX, toX);

        // Inject gaps by pushing ground points down in gap regions
        var gapX = fromX + 400;
        while (gapX < toX - 200) {
            if (Math.random() < 0.25) {
                var gapLen = 70 + Math.random() * 60;
                // Push ground points in the gap below screen
                for (var gi = 0; gi < this.groundPoints.length; gi++) {
                    var gp = this.groundPoints[gi];
                    if (gp.x >= gapX && gp.x <= gapX + gapLen) {
                        gp.y = this.H + 200;
                    }
                }
                // Maybe add a stepping stone
                if (Math.random() < 0.5) {
                    var baseY = this.getBaseGroundY();
                    this.platforms.push({
                        x: gapX + gapLen/2 - 50,
                        y: baseY - 40 - Math.random()*40,
                        w: 90 + Math.random()*45, h: 21, isGround: false
                    });
                }
                gapX += gapLen + 300 + Math.random() * 400;
            } else {
                gapX += 200 + Math.random() * 200;
            }
        }

        // Floating platforms — more frequent
        var x = fromX + 150;
        while (x < toX) {
            if (Math.random() < 0.5) {
                var gy = this.getGroundYAt(x);
                // Don't place platforms over gaps
                if (gy < this.H + 100) {
                    var pw = 120 + Math.random() * 120;
                    var py = gy - 110 - Math.random() * 90;
                    this.platforms.push({ x: x, y: py, w: pw, h: 21, isGround: false });
                }
            }
            x += 200 + Math.random() * 250;
        }
        return toX;
    }

    findSurfaceAt(worldX) {
        return { y: this.getGroundYAt(worldX) };
    }

    extendLevel() {
        // Extend terrain ahead
        var aheadNeeded = this.scrollX + this.W * 3;
        if (this.levelEndX < aheadNeeded) {
            this.levelEndX = this.generateTerrain(this.levelEndX, aheadNeeded);
        }
        // Maintain enemies: ensure there are always some ahead of the player
        this.maintainEnemies();
    }

    maintainEnemies() {
        var q = this.questions[this.currentQ];
        if (!q) return;
        var playerX = this.player ? this.player.x : 0;
        var screenRight = this.scrollX + this.W;

        // Count enemies visible and ahead
        var visibleCount = 0;
        var rightmostEnemy = playerX;
        var hasCorrectAhead = false;
        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            if (!e.alive) continue;
            if (e.x > playerX - 100 && e.x < screenRight + this.W * 2) {
                visibleCount++;
                if (e.x > rightmostEnemy) rightmostEnemy = e.x;
                if (e.isCorrect && e.x > playerX) hasCorrectAhead = true;
            }
        }

        // Spawn new enemies ahead if needed
        var DESIRED = 5;
        var spawnFrom = Math.max(rightmostEnemy + 200, screenRight + 50);
        var spawnTo = screenRight + this.W * 2;

        while (visibleCount < DESIRED && spawnFrom < spawnTo) {
            var gy = this.getGroundYAt(spawnFrom);
            if (gy < this.H + 50) {
                var makeCorrect = !hasCorrectAhead && (Math.random() < 0.3);
                var answer = makeCorrect ? q.answer : this.randomWrongAnswer();
                this.enemies.push(this.createEnemy({ x: spawnFrom, y: gy }, answer, makeCorrect));
                if (makeCorrect) hasCorrectAhead = true;
                visibleCount++;
                spawnFrom += 200 + Math.random() * 200;
            } else {
                spawnFrom += 100;
            }
        }

        // Guarantee at least one correct enemy ahead
        if (!hasCorrectAhead) {
            var cx = screenRight + 300 + Math.random() * 400;
            for (var t = 0; t < 15; t++) {
                var cgy = this.getGroundYAt(cx);
                if (cgy < this.H + 50) {
                    this.enemies.push(this.createEnemy({ x: cx, y: cgy }, q.answer, true));
                    break;
                }
                cx += 80;
            }
        }
    }

    cleanupLevel() {
        var behind = this.scrollX - this.W * 0.5;
        var ahead = this.scrollX + this.W * 3;
        this.platforms = this.platforms.filter(function(p) { return p.x + p.w > behind; });
        this.enemies = this.enemies.filter(function(e) {
            if (!e.alive) return false;
            if (e.x + e.w < behind) return false;
            if (e.x > ahead) return false;
            return true;
        });
        this.shrapnel = this.shrapnel.filter(function(s) { return s.x > behind; });
        while (this.groundPoints.length > 2 && this.groundPoints[1].x < behind) {
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
            displaySlope: 0,
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
        this.bossPhase = false; this.boss = null; this.bossIntroTimer = 0;
        this.gameOver = false; this.jumpConsumed = false;
        this.scrollX = 0; this.levelEndX = 0;

        this.questions = Array.from({ length: this.TOTAL_Q }, () => this.makeQuestion());

        await this.loadAvatar();
        await new Promise(function(r) { requestAnimationFrame(function() { requestAnimationFrame(r); }); });
        this.resizeCanvas();

        this.levelEndX = this.generateTerrain(0, this.W * 4);

        var startY = this.getGroundYAt(80);
        this.player = {
            x: 80, y: startY - 87,
            w: 54, h: 87, vx: 0, vy: 0,
            onGround: true, facingRight: true, invTimer: 0,
            prevY: startY - 87, walkPhase: 0, displaySlope: 0,
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
        if (this.bossPhase) {
            this.updateBoss(dt);
        } else {
            this.updateEnemies(dt);
            this.checkCollisions();
            this.extendLevel();
            this.cleanupLevel();
        }
        this.updateShrapnel(dt);
        this.updateParticles(dt);
        this.updateFlyingFriends(dt);

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
            p.walkPhase += Math.abs(p.vx) * dt * 0.035;
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

            if (e.speed > 0) e.walkPhase += e.speed * dt * 0.05;

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
            this.startBossPhase();
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
        if (this.bossPhase) {
            this.drawBoss();
        } else {
            this.drawEnemies();
        }
        this.drawPlayer();
        this.drawParticlesWorld();
        if (!this.bossPhase) this.drawQuestion();
        ctx.restore();
        this.drawFriendsHUD();
        this.drawFlyingFriends();
        if (this.bossPhase && this.bossIntroTimer > 0) this.drawBossIntro();
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

        // Grass tufts — use x position for deterministic placement
        ctx.fillStyle = '#3d7a50';
        var step = this.GROUND_STEP;
        var tuftStart = Math.floor(lo / (step * 2)) * (step * 2);
        for (var tx = tuftStart; tx <= hi; tx += step * 2) {
            var ty = this.getGroundYAt(tx);
            ctx.fillRect(tx - 2, ty - 8, 4, 10);
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
        var bob = Math.abs(Math.sin(walkPhase)) * 2.5;
        var lean = Math.sin(walkPhase * 0.5) * 0.03;
        var cx = x + w/2;
        var feet = y + h;

        ctx.save();
        ctx.translate(cx, feet);
        ctx.rotate(slope * 0.3 + lean);
        ctx.translate(-cx, -feet);
        ctx.drawImage(img, x - 1, y - bob, w + 2, h - 4);
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
        var targetSlope = p.onGround ? this.getGroundSlopeAt(p.x + p.w/2) : 0;
        p.displaySlope += (targetSlope - p.displaySlope) * 0.15;
        if (this.avatarLoaded && this.avatarImg) {
            this.drawAnimatedSprite(ctx, this.avatarImg, p.x, p.y, p.w, p.h, p.walkPhase, p.displaySlope);
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

            var eTargetSlope = e.onGround ? this.getGroundSlopeAt(ecx) : 0;
            e.displaySlope += (eTargetSlope - e.displaySlope) * 0.15;
            if (e.avatarImg) {
                this.drawAnimatedSprite(ctx, e.avatarImg, e.x, e.y, e.w, e.h, e.walkPhase || 0, e.displaySlope);
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

    // ── BOSS FIGHT ─────────────────────────────────────────────────────────

    startBossPhase() {
        this.bossPhase = true;
        this.bossIntroTimer = 2.0;
        // Remove all regular enemies
        this.enemies = [];

        var q = this.makeQuestion();
        var bossX = this.player.x + this.W * 0.9;
        var groundY = this.getGroundYAt(bossX);

        // Flatten ground around boss arena
        var arenaStart = bossX - 300;
        var arenaEnd   = bossX + 300;
        for (var i = 0; i < this.groundPoints.length; i++) {
            var gp = this.groundPoints[i];
            if (gp.x >= arenaStart && gp.x <= arenaEnd) {
                gp.y = groundY;
            }
        }

        // Build 5 tentacles: 1 correct + 4 wrong
        var answers = [q.answer];
        var wrongs = q.wrongs.slice(0, 4);
        while (wrongs.length < 4) wrongs.push(q.answer + Math.floor(Math.random()*10) + 1);
        answers = answers.concat(wrongs);
        bShuffle(answers);

        var tentacles = [];
        var spacing = 100;
        var startX = bossX - spacing * 2;
        for (var t = 0; t < 5; t++) {
            tentacles.push({
                x: startX + t * spacing,
                baseY: groundY,
                answer: answers[t],
                isCorrect: answers[t] === q.answer,
                alive: true,
                phase: Math.random() * Math.PI * 2,
                height: 120 + Math.random() * 40,
                swaySpeed: 1.5 + Math.random() * 1.5,
                hitCooldown: 0,
            });
        }

        this.boss = {
            x: bossX,
            y: groundY - 180,
            question: q,
            tentacles: tentacles,
            time: 0,
            shakeTimer: 0,
            defeated: false,
        };
    }

    updateBoss(dt) {
        var b = this.boss;
        if (!b || b.defeated) return;
        b.time += dt;
        if (b.shakeTimer > 0) b.shakeTimer -= dt;

        // Update tentacle cooldowns
        for (var i = 0; i < b.tentacles.length; i++) {
            var t = b.tentacles[i];
            if (t.hitCooldown > 0) t.hitCooldown -= dt;
        }

        // Skip collision during intro
        if (this.bossIntroTimer > 0) {
            this.bossIntroTimer -= dt;
            return;
        }

        this.checkBossCollisions();
    }

    checkBossCollisions() {
        var p = this.player;
        var b = this.boss;
        if (!p || !b || p.invTimer > 0) return;

        var px = p.x + 8, py = p.y + 5, pw = p.w - 16, ph = p.h - 5;

        for (var i = 0; i < b.tentacles.length; i++) {
            var t = b.tentacles[i];
            if (!t.alive || t.hitCooldown > 0) continue;

            // Tentacle hitbox: a vertical column that sways
            var sway = Math.sin(b.time * t.swaySpeed + t.phase) * 25;
            var tx = t.x + sway - 18;
            var ty = t.baseY - t.height;
            var tw = 36;
            var th = t.height;

            if (!(px + pw > tx && px < tx + tw && py + ph > ty && py < ty + th)) continue;

            // Player stomps from above
            if (p.vy > 0 && p.prevY + p.h <= ty + th * 0.35) {
                p.vy = this.JUMP_VEL * 0.6;
                if (t.isCorrect) {
                    // Stomping the correct one hurts the player
                    this.playerHit();
                    t.hitCooldown = 1.0;
                    b.shakeTimer = 0.3;
                } else {
                    // Destroy wrong tentacle
                    t.alive = false;
                    this.spawnParticles(t.x + sway, ty + th * 0.3, '#8B45A6', '#DA70D6', 30);
                    this.spawnShrapnel(t.x + sway, ty + th * 0.3, 20);
                    b.shakeTimer = 0.4;
                    // Check win: all wrong destroyed?
                    var wrongAlive = b.tentacles.filter(function(tt) { return tt.alive && !tt.isCorrect; }).length;
                    if (wrongAlive === 0) {
                        b.defeated = true;
                        this.spawnParticles(b.x, b.y, '#FFD700', '#FF6347', 50);
                        this.spawnParticles(b.x, b.y, '#4CAF50', '#00BCD4', 40);
                        setTimeout(function() { this.endGame(true); }.bind(this), 800);
                    }
                }
            } else {
                // Player walks into tentacle — take damage
                this.playerHit();
                p.vy = this.JUMP_VEL * 0.4;
                p.vx = (p.x < t.x) ? -300 : 300;
                t.hitCooldown = 0.5;
            }
            break;
        }
    }

    drawBoss() {
        var b = this.boss;
        if (!b) return;
        var ctx = this.ctx;
        var shake = b.shakeTimer > 0 ? (Math.random() - 0.5) * 6 : 0;

        // Draw tentacles
        for (var i = 0; i < b.tentacles.length; i++) {
            var t = b.tentacles[i];
            if (!t.alive) continue;
            var sway = Math.sin(b.time * t.swaySpeed + t.phase) * 25;
            var baseX = t.x + sway;
            var baseY = t.baseY;
            var topY  = baseY - t.height;

            // Tentacle body — thick wavy line with suckers
            ctx.save();
            ctx.lineWidth = 22;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#7B3FA0';
            ctx.beginPath();
            ctx.moveTo(t.x, baseY);
            var cp1x = t.x + sway * 0.3, cp1y = baseY - t.height * 0.33;
            var cp2x = baseX + sway * 0.7, cp2y = baseY - t.height * 0.66;
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, baseX, topY);
            ctx.stroke();

            // Inner lighter line
            ctx.lineWidth = 12;
            ctx.strokeStyle = '#9B59B6';
            ctx.beginPath();
            ctx.moveTo(t.x, baseY);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, baseX, topY);
            ctx.stroke();

            // Suckers
            ctx.fillStyle = '#DA70D6';
            for (var s = 0.2; s <= 0.8; s += 0.3) {
                var sx = t.x + (baseX - t.x) * s + sway * s * 0.5;
                var sy = baseY - t.height * s;
                ctx.beginPath(); ctx.arc(sx - 5, sy, 4, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(sx + 5, sy, 4, 0, Math.PI * 2); ctx.fill();
            }

            // Tip
            ctx.fillStyle = '#9B59B6';
            ctx.beginPath(); ctx.arc(baseX, topY, 10, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // Answer label on tentacle
            var ans = String(t.answer);
            ctx.font = 'bold 18px Arial';
            var tw2 = ctx.measureText(ans).width;
            var lw = tw2 + 18, lh = 28;
            var lx = baseX - lw / 2, ly = topY - lh - 8;
            ctx.fillStyle = t.isCorrect ? 'rgba(76,175,80,0.9)' : 'rgba(25,25,45,0.88)';
            bRR(ctx, lx, ly, lw, lh, 8); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
            ctx.fillText(ans, baseX, ly + lh - 7);
        }

        // Draw octopus body
        var bx = b.x + shake;
        var by = b.y + Math.sin(b.time * 1.2) * 8;
        var bodyR = 65;

        // Body
        ctx.fillStyle = '#6B2D8B';
        ctx.beginPath(); ctx.ellipse(bx, by, bodyR, bodyR * 0.85, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8B45A6';
        ctx.beginPath(); ctx.ellipse(bx, by, bodyR * 0.85, bodyR * 0.7, 0, 0, Math.PI * 2); ctx.fill();

        // Eyes
        var wrongAlive = b.tentacles.filter(function(tt) { return tt.alive && !tt.isCorrect; }).length;
        var eyeOffY = b.defeated ? 5 : 0;
        // Left eye
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(bx - 22, by - 8 + eyeOffY, 18, 20, 0, 0, Math.PI * 2); ctx.fill();
        // Right eye
        ctx.beginPath(); ctx.ellipse(bx + 22, by - 8 + eyeOffY, 18, 20, 0, 0, Math.PI * 2); ctx.fill();
        // Pupils — track player
        var pupilX = 0, pupilY = 0;
        if (this.player) {
            var dx = (this.player.x + this.player.w / 2) - bx;
            var dy = (this.player.y + this.player.h / 2) - by;
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            pupilX = (dx / dist) * 6;
            pupilY = (dy / dist) * 6;
        }
        ctx.fillStyle = b.defeated ? '#999' : (wrongAlive <= 1 ? '#ff3300' : '#1a1a2e');
        ctx.beginPath(); ctx.arc(bx - 22 + pupilX, by - 8 + pupilY + eyeOffY, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + 22 + pupilX, by - 8 + pupilY + eyeOffY, 8, 0, Math.PI * 2); ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(bx - 25, by - 14 + eyeOffY, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + 19, by - 14 + eyeOffY, 4, 0, Math.PI * 2); ctx.fill();

        // Mouth
        if (b.defeated) {
            ctx.strokeStyle = '#4a2060';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(bx - 15, by + 25);
            ctx.quadraticCurveTo(bx, by + 15, bx + 15, by + 25);
            ctx.stroke();
        } else if (wrongAlive <= 1) {
            // Angry mouth
            ctx.fillStyle = '#ff3300';
            ctx.beginPath();
            ctx.moveTo(bx - 12, by + 18);
            ctx.quadraticCurveTo(bx, by + 30, bx + 12, by + 18);
            ctx.closePath(); ctx.fill();
        } else {
            ctx.fillStyle = '#4a2060';
            ctx.beginPath(); ctx.ellipse(bx, by + 22, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
        }

        // Defeated X overlay
        if (b.defeated) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = '#ff3300'; ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(bx - 40, by - 40); ctx.lineTo(bx + 40, by + 40);
            ctx.moveTo(bx + 40, by - 40); ctx.lineTo(bx - 40, by + 40);
            ctx.stroke();
            ctx.restore();
        }

        // Question above boss
        if (!b.defeated) {
            var qText = b.question.text;
            ctx.font = 'bold 24px Arial';
            var qtw = ctx.measureText(qText).width;
            var qbw = qtw + 30, qbh = 40;
            var qbx = bx - qbw / 2, qby = by - bodyR - qbh - 15;
            ctx.fillStyle = 'rgba(255,255,255,0.96)';
            ctx.strokeStyle = '#8B45A6'; ctx.lineWidth = 3;
            bRR(ctx, qbx, qby, qbw, qbh, 12); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#333'; ctx.textAlign = 'center';
            ctx.fillText(qText, bx, qby + qbh - 10);
        }
    }

    drawBossIntro() {
        var ctx = this.ctx;
        var alpha = Math.min(1, this.bossIntroTimer / 0.5);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,' + (alpha * 0.4) + ')';
        ctx.fillRect(0, 0, this.W, this.H);
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = '#ff3300';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
        ctx.strokeText('BOSS FIGHT!', this.W / 2, this.H / 2);
        ctx.fillText('BOSS FIGHT!', this.W / 2, this.H / 2);
        ctx.font = '20px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('Jump on wrong answers to destroy tentacles!', this.W / 2, this.H / 2 + 40);
        ctx.restore();
    }

    endGame(won) {
        if (this.gameOver) return;
        this.gameOver = true; this.isRunning = false;
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.controls = { left:false, right:false, jump:false };
        var totalQ = this.TOTAL_Q + (this.bossPhase ? 1 : 0);
        var score = this.questionsCompleted + (won && this.bossPhase ? 1 : 0);
        if (typeof app !== 'undefined')
            setTimeout(function() { app.showBattleResults(score, totalQ, won); }.bind(this), 420);
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
