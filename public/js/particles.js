class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || (Math.random() - 0.5) * 4;
        this.vy = options.vy || (Math.random() - 0.5) * 4;
        this.life = options.life || 1;
        this.maxLife = this.life;
        this.decay = options.decay || 0.02;
        this.size = options.size || 3;
        this.color = options.color || { r: 255, g: 100, b: 50 };
        this.type = options.type || 'circle';
        this.gravity = options.gravity || 0;
        this.friction = options.friction || 0.99;
        this.glow = options.glow || false;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.life -= this.decay;
        this.rotation += this.rotSpeed;
        return this.life > 0;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        const size = this.size * alpha;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        if (this.glow) {
            ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`;
            ctx.shadowBlur = size * 3;
        }

        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`;

        switch (this.type) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'square':
                ctx.fillRect(-size, -size, size * 2, size * 2);
                break;
            case 'star':
                this.drawStar(ctx, size);
                break;
            case 'trail':
                ctx.beginPath();
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
                ctx.globalAlpha = alpha * 0.3;
                ctx.fill();
                break;
        }

        ctx.restore();
    }

    drawStar(ctx, size) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            const innerAngle = angle + Math.PI / 5;
            ctx.lineTo(Math.cos(innerAngle) * size * 0.4, Math.sin(innerAngle) * size * 0.4);
        }
        ctx.closePath();
        ctx.fill();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
    }

    emit(x, y, count, options = {}) {
        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            this.particles.push(new Particle(x, y, {
                ...options,
                vx: options.vx !== undefined ? options.vx : (Math.random() - 0.5) * (options.speed || 4),
                vy: options.vy !== undefined ? options.vy : (Math.random() - 0.5) * (options.speed || 4),
            }));
        }
    }

    explosion(x, y, color = { r: 255, g: 150, b: 50 }, count = 20) {
        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.5,
                decay: 0.02,
                size: 2 + Math.random() * 4,
                color: {
                    r: color.r + (Math.random() - 0.5) * 50,
                    g: color.g + (Math.random() - 0.5) * 50,
                    b: color.b + (Math.random() - 0.5) * 50,
                },
                glow: true,
                friction: 0.96,
            }));
        }
    }

    trail(x, y, color = { r: 0, g: 200, b: 255 }) {
        if (this.particles.length < this.maxParticles) {
            this.particles.push(new Particle(x, y, {
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1,
                life: 0.3 + Math.random() * 0.3,
                decay: 0.03,
                size: 1 + Math.random() * 2,
                color,
                type: 'trail',
                glow: true,
            }));
        }
    }

    xpPickup(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                life: 0.5,
                decay: 0.025,
                size: 3,
                color: { r: 0, g: 212, b: 255 },
                type: 'star',
                glow: true,
                friction: 0.92,
            }));
        }
    }

    update() {
        this.particles = this.particles.filter(p => p.update());
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }

    clear() {
        this.particles = [];
    }
}