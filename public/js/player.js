const SHIP_TYPES = {
    FIGHTER: {
        name: 'Истребитель',
        icon: '🚀',
        desc: 'Сбалансированный корабль',
        health: 100,
        speed: 4,
        startWeapon: 'BLASTER',
        color: { r: 0, g: 200, b: 255 },
        unlocked: true,
        price: 0,
    },
    SCOUT: {
        name: 'Разведчик',
        icon: '⚡',
        desc: 'Быстрый, но хрупкий',
        health: 60,
        speed: 6,
        startWeapon: 'LASER',
        color: { r: 255, g: 255, b: 0 },
        unlocked: true,
        price: 0,
    },
    TANK: {
        name: 'Крейсер',
        icon: '🛡️',
        desc: 'Много HP, медленный',
        health: 200,
        speed: 2.5,
        startWeapon: 'SHOTGUN',
        color: { r: 150, g: 50, b: 255 },
        unlocked: false,
        price: 500,
    },
    STRIKER: {
        name: 'Штурмовик',
        icon: '💥',
        desc: '+50% урона',
        health: 80,
        speed: 3.5,
        startWeapon: 'MISSILE',
        color: { r: 255, g: 80, b: 0 },
        unlocked: false,
        price: 1000,
    },
};

class Player {
    constructor(shipType = 'FIGHTER') {
        const config = SHIP_TYPES[shipType];
        this.x = 0;
        this.y = 0;
        this.shipType = shipType;
        this.maxHealth = config.health;
        this.health = this.maxHealth;
        this.speed = config.speed;
        this.baseSpeed = config.speed;
        this.color = { ...config.color };
        this.size = 18;
        this.angle = 0;
        this.weapons = [new Weapon(config.startWeapon)];
        this.level = 1;
        this.xp = 0;
        this.xpToNext = 20;
        this.kills = 0;
        this.score = 0;
        this.coins = 0;
        this.alive = true;
        this.invincible = 0;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.speedBoostTimer = 0;
        this.xpMultiplier = 1;
        this.xpMultiplierTimer = 0;
        this.magnetRange = 150;
        this.damageMultiplier = shipType === 'STRIKER' ? 1.5 : 1;
        this.trail = [];

        // Stats upgrades
        this.maxHealthBonus = 0;
        this.speedBonus = 0;
        this.armorBonus = 0;
        this.regenRate = 0;
        this.regenTimer = 0;
    }

    update(inputX, inputY) {
        // Movement
        if (inputX !== 0 || inputY !== 0) {
            const len = Math.hypot(inputX, inputY);
            const currentSpeed = this.speed + this.speedBonus + (this.speedBoostTimer > 0 ? 2 : 0);
            this.x += (inputX / len) * currentSpeed;
            this.y += (inputY / len) * currentSpeed;
            this.angle = Math.atan2(inputY, inputX);
        }

        // Trail
        if (Math.random() < 0.3) {
            this.trail.push({
                x: this.x - Math.cos(this.angle) * this.size,
                y: this.y - Math.sin(this.angle) * this.size,
                life: 1,
            });
        }
        this.trail = this.trail.filter(t => {
            t.life -= 0.05;
            return t.life > 0;
        });

        // Timers
        if (this.invincible > 0) this.invincible--;
        if (this.shieldTimer > 0) {
            this.shieldTimer--;
            if (this.shieldTimer <= 0) this.shieldActive = false;
        }
        if (this.speedBoostTimer > 0) this.speedBoostTimer--;
        if (this.xpMultiplierTimer > 0) {
            this.xpMultiplierTimer--;
            if (this.xpMultiplierTimer <= 0) this.xpMultiplier = 1;
        }

        // Regen
        if (this.regenRate > 0) {
            this.regenTimer++;
            if (this.regenTimer >= 60) {
                this.regenTimer = 0;
                this.health = Math.min(this.maxHealth + this.maxHealthBonus, this.health + this.regenRate);
            }
        }
    }

    takeDamage(damage) {
        if (this.invincible > 0) return false;
        if (this.shieldActive) {
            this.shieldActive = false;
            this.shieldTimer = 0;
            return false;
        }

        const actualDamage = Math.max(1, damage - this.armorBonus);
        this.health -= actualDamage;
        this.invincible = 30;

        if (this.health <= 0) {
            this.alive = false;
            return true;
        }
        return false;
    }

    addXP(amount) {
        this.xp += amount * this.xpMultiplier;
        if (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.floor(this.xpToNext * 1.3);
            return true; // Level up!
        }
        return false;
    }

    draw(ctx, cameraX, cameraY) {
        const sx = this.x - cameraX;
        const sy = this.y - cameraY;

        // Draw trail
        this.trail.forEach(t => {
            ctx.save();
            ctx.globalAlpha = t.life * 0.4;
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${t.life})`;
            ctx.beginPath();
            ctx.arc(t.x - cameraX, t.y - cameraY, 3 * t.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.angle);

        // Shield visual
        if (this.shieldActive) {
            ctx.save();
            ctx.rotate(-this.angle);
            const shieldPulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
            ctx.strokeStyle = `rgba(100, 200, 255, ${shieldPulse})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = 'rgba(100, 200, 255, 0.5)';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Invincibility flash
        if (this.invincible > 0 && Math.floor(this.invincible / 3) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Engine glow
        ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.8)`;
        ctx.shadowBlur = 25;

        // Ship body
        ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size * 0.8, -this.size * 0.6);
        ctx.lineTo(-this.size * 0.4, 0);
        ctx.lineTo(-this.size * 0.8, this.size * 0.6);
        ctx.closePath();
        ctx.fill();

        // Ship outline
        ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cockpit
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(this.size * 0.2, 0, this.size * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Engine flames
        ctx.fillStyle = `rgba(255, 150, 50, ${0.5 + Math.random() * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.8, -this.size * 0.3);
        ctx.lineTo(-this.size * (1.2 + Math.random() * 0.5), 0);
        ctx.lineTo(-this.size * 0.8, this.size * 0.3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    drawOrbitalWeapons(ctx, cameraX, cameraY, time) {
        const sx = this.x - cameraX;
        const sy = this.y - cameraY;

        this.weapons.forEach(weapon => {
            if (weapon.config.orbital) {
                const orbitRadius = weapon.config.range;
                const count = weapon.config.count;

                for (let i = 0; i < count; i++) {
                    const angle = (time * 0.003) + (i * Math.PI * 2) / count;
                    const ox = sx + Math.cos(angle) * orbitRadius;
                    const oy = sy + Math.sin(angle) * orbitRadius;

                    ctx.save();
                    ctx.shadowColor = `rgba(${weapon.config.color.r}, ${weapon.config.color.g}, ${weapon.config.color.b}, 0.8)`;
                    ctx.shadowBlur = 15;
                    ctx.fillStyle = `rgb(${weapon.config.color.r}, ${weapon.config.color.g}, ${weapon.config.color.b})`;
                    ctx.beginPath();
                    ctx.arc(ox, oy, weapon.config.projectileSize, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.beginPath();
                    ctx.arc(ox, oy, weapon.config.projectileSize * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        });
    }
}