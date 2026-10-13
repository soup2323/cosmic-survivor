const WEAPON_TYPES = {
    BLASTER: {
        name: 'Бластер',
        icon: '🔫',
        description: 'Базовый бластер',
        damage: 10,
        speed: 8,
        fireRate: 500,
        range: 400,
        projectileSize: 4,
        color: { r: 0, g: 200, b: 255 },
        pierce: 0,
        count: 1,
    },
    SHOTGUN: {
        name: 'Дробовик',
        icon: '💥',
        description: 'Стреляет веером',
        damage: 8,
        speed: 7,
        fireRate: 800,
        range: 250,
        projectileSize: 3,
        color: { r: 255, g: 150, b: 50 },
        pierce: 0,
        count: 5,
        spread: 0.4,
    },
    LASER: {
        name: 'Лазер',
        icon: '⚡',
        description: 'Пронзающий луч',
        damage: 5,
        speed: 15,
        fireRate: 300,
        range: 600,
        projectileSize: 2,
        color: { r: 255, g: 50, b: 50 },
        pierce: 3,
        count: 1,
    },
    ORBIT: {
        name: 'Орбитальный щит',
        icon: '🛡️',
        description: 'Вращающиеся снаряды',
        damage: 15,
        speed: 0,
        fireRate: 0,
        range: 100,
        projectileSize: 8,
        color: { r: 123, g: 47, b: 247 },
        pierce: 999,
        count: 3,
        orbital: true,
    },
    MISSILE: {
        name: 'Ракеты',
        icon: '🚀',
        description: 'Самонаводящиеся ракеты',
        damage: 30,
        speed: 5,
        fireRate: 1500,
        range: 500,
        projectileSize: 6,
        color: { r: 255, g: 100, b: 0 },
        pierce: 0,
        count: 1,
        homing: true,
    },
    LIGHTNING: {
        name: 'Молния',
        icon: '⚡',
        description: 'Цепная молния',
        damage: 12,
        speed: 0,
        fireRate: 1000,
        range: 200,
        projectileSize: 0,
        color: { r: 100, g: 200, b: 255 },
        pierce: 0,
        count: 1,
        chain: 3,
        lightning: true,
    },
};

class Weapon {
    constructor(type, level = 1) {
        this.type = type;
        this.config = { ...WEAPON_TYPES[type] };
        this.level = level;
        this.lastFired = 0;
        this.orbitAngle = 0;
        this.applyLevel();
    }

    applyLevel() {
        const mult = 1 + (this.level - 1) * 0.2;
        this.config.damage = WEAPON_TYPES[this.type].damage * mult;
        
        if (this.level >= 3) this.config.count = WEAPON_TYPES[this.type].count + 1;
        if (this.level >= 5) this.config.count = WEAPON_TYPES[this.type].count + 2;
        if (this.level >= 7) this.config.pierce = (WEAPON_TYPES[this.type].pierce || 0) + 1;
        
        this.config.fireRate = WEAPON_TYPES[this.type].fireRate * Math.max(0.5, 1 - (this.level - 1) * 0.05);
    }

    levelUp() {
        this.level++;
        this.applyLevel();
    }

    canFire(now) {
        if (this.config.orbital) return false;
        return now - this.lastFired >= this.config.fireRate;
    }
}

class Projectile {
    constructor(x, y, angle, weapon, owner) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.owner = owner;
        this.speed = weapon.config.speed;
        this.damage = weapon.config.damage;
        this.size = weapon.config.projectileSize;
        this.color = weapon.config.color;
        this.pierce = weapon.config.pierce;
        this.homing = weapon.config.homing || false;
        this.range = weapon.config.range;
        this.distanceTraveled = 0;
        this.alive = true;
        this.hitEnemies = new Set();
        this.trail = [];
        this.type = weapon.type;

        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }

    update(enemies) {
        if (this.homing && enemies.length > 0) {
            let closest = null;
            let closestDist = Infinity;
            enemies.forEach(e => {
                const d = Math.hypot(e.x - this.x, e.y - this.y);
                if (d < closestDist && !this.hitEnemies.has(e.id)) {
                    closest = e;
                    closestDist = d;
                }
            });
            if (closest) {
                const targetAngle = Math.atan2(closest.y - this.y, closest.x - this.x);
                let diff = targetAngle - this.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                this.angle += diff * 0.08;
                this.vx = Math.cos(this.angle) * this.speed;
                this.vy = Math.sin(this.angle) * this.speed;
            }
        }

        this.x += this.vx;
        this.y += this.vy;
        this.distanceTraveled += this.speed;

        // Trail
        this.trail.push({ x: this.x, y: this.y, life: 1 });
        if (this.trail.length > 10) this.trail.shift();
        this.trail.forEach(t => t.life -= 0.1);

        if (this.distanceTraveled >= this.range) {
            this.alive = false;
        }
    }

    draw(ctx, cameraX, cameraY) {
        const sx = this.x - cameraX;
        const sy = this.y - cameraY;

        // Draw trail
        ctx.save();
        this.trail.forEach(t => {
            if (t.life > 0) {
                ctx.globalAlpha = t.life * 0.5;
                ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${t.life})`;
                ctx.beginPath();
                ctx.arc(t.x - cameraX, t.y - cameraY, this.size * t.life * 0.7, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();

        // Draw projectile
        ctx.save();
        ctx.shadowColor = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
        ctx.shadowBlur = 15;
        ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
        ctx.beginPath();
        ctx.arc(sx, sy, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(sx, sy, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    onHit() {
        if (this.pierce > 0) {
            this.pierce--;
        } else {
            this.alive = false;
        }
    }
}