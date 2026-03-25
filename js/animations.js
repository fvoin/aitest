// Animation controller for visual effects
class Animations {
    constructor() {
        this.canvas = document.getElementById('animation-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animationFrame = null;
        this.setupCanvas();
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    showFireworks() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Show particles
        this.particles = [];
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        for (let burst = 0; burst < 3; burst++) {
            setTimeout(() => {
                this.createFireworkBurst(
                    centerX + (Math.random() - 0.5) * 300,
                    centerY + (Math.random() - 0.5) * 200
                );
            }, burst * 150);
        }
        
        this.animate();
    }

    createFireworkBurst(x, y) {
        const particleCount = 40;
        const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8b94', '#c7ceea', '#ffd93d', '#6bcf7f'];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const velocity = 3 + Math.random() * 4;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: 1,
                decay: 0.02 + Math.random() * 0.01,
                size: 4 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    }

    showFailAnimation() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Show fail particles
        this.particles = [];
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: -10,
                vx: (Math.random() - 0.5) * 2,
                vy: 2 + Math.random() * 3,
                life: 1,
                decay: 0.025,
                size: 3 + Math.random() * 3,
                color: '#ff4757'
            });
        }
        
        this.animate();
    }

    animate() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        const loop = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1;
                p.life -= p.decay;
                
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }
                
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = p.life;
                this.ctx.fill();
            }
            
            this.ctx.globalAlpha = 1;
            
            if (this.particles.length > 0) {
                this.animationFrame = requestAnimationFrame(loop);
            }
        };
        
        loop();
    }
}

// Initialize animations instance
const animations = new Animations();
