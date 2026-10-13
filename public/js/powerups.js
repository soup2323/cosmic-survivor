const POWERUP_TYPES = {
    HEALTH: {
        name: 'Здоровье',
        icon: '❤️',
        color: { r: 255, g: 50, b: 80 },
        rarity: 'common',
    },
    XP_BOOST: {
        name: 'Опыт x2',
        icon: '⭐',
        color: { r: 0, g: 200, b: 255 },
        rarity: 'rare',
    },
    MAGNET: {
        name: 'Магнит',
        icon: '🧲',
        color: { r: 255, g: 200, b: 0 },
        rarity: 'common',
    },
    BOMB: {
        name: 'Бомба',
        icon: '💣',
        color: { r: 255, g: 100, b: 0 },
        rarity: 'rare',
    },
    SHIELD: {
        name: 'Щит',
        icon: '🛡️',
        color: { r: 100, g: 200, b: 255 },
        rarity: 'epic',
    },
    SPEED: {
        name: 'Скорость',
        icon: '⚡',
        color: { r: 255, g: 255, b: 0 },
        rarity: 'common',
    },
};

class XPOrb {
    constructor(x, y, value = 5) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.size = 5 + Math.min(value / 5, 8);
        this.alive = true;
        this.angle = Math.random() * Math.PI * 2;
        this.bobSpeed = 0.05 + Math.random() * 0.03;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.magnetDist = 150;
        this.collected = false;
    }

    update(playerX, playerY, magnetRange = 150) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < magnetRange) {
            const speed = Math.max(2, (magnetRange - dist) / 10);
            this.x += (dx / dist) * speed;
            this.y += (dy / dist) * speed;
        }

        if (dist < 20) {
            this.collected = true;
            this.alive = false;
        }

        this.angle += this.bobSpeed;
    }

    draw(ctx, cameraX, cameraY) {
        const sx = this.x - cameraX;
        const sy = this.y - cameraY + Math.sin(this.angle + this.bobOffset) * 3;

        ctx.save();
        
        // Outer glow
        ctx.shadowColor = 'rgba(0, 212, 255, 0.6)';
        ctx.shadowBlur = 15;
        
        const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, this.size);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.4, 'rgba(0, 212, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 100, 200, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sx, sy, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Diamond shape inside
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.4);
        ctx.lineTo(this.size * 0.3, 0);
        ctx.lineTo(0, this.size * 0.4);
        ctx.lineTo(-this.size * 0.3, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = POWERUP_TYPES[type];
        this.size = 18;
        this.alive = true;
        this.angle = 0;
        this.lifetime = 600; // 10 seconds at 60fps
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    update(playerX, playerY) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.hypot(dx, dy);

        this.angle += 0.03;
        this.lifetime--;

        if (this.lifetime <= 0) {
            this.alive = false;
            return null;
        }

        if (dist < 30) {
            this.alive = false;
            return this.type;
        }

        return null;
    }

    draw(ctx, cameraX, cameraY) {
        const sx = this.x - cameraX;
        const sy = this.y - cameraY + Math.sin(this.angle * 2 + this.bobOffset) * 5;

        ctx.save();

        // Pulsing glow
        const pulse = 0.5 + Math.sin(this.angle * 3) * 0.3;
        ctx.shadowColor = `rgba(${this.config.color.r}, ${this.config.color.g}, ${this.config.color.b}, ${pulse})`;
        ctx.shadowBlur = 25;

        // Background circle
        ctx.fillStyle = `rgba(${this.config.color.r}, ${this.config.color.g}, ${this.config.color.b}, 0.2)`;
        ctx.beginPath();
        ctx.arc(sx, sy, this.size + 5, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = `rgba(${this.config.color.r}, ${this.config.color.g}, ${this.config.color.b}, 0.8)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, this.size, 0, Math.PI * 2);
        ctx.stroke();

        // Icon
        ctx.shadowBlur = 0;
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.config.icon, sx, sy);

        // Lifetime indicator
        if (this.lifetime < 180) {
            const alpha = (Math.sin(Date.now() * 0.01) + 1) / 2;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(sx, sy, this.size + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}