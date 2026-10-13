let enemyIdCounter = 0;

const ENEMY_TYPES = {
    GRUNT: { name: 'Мясной жук', health: 25, speed: 1.8, damage: 5, size: 15, xp: 5, color: { r: 255, g: 80, b: 80 }, coins: 1, shape: 'circle' },
    FAST: { name: 'Перехватчик', health: 15, speed: 3.5, damage: 4, size: 12, xp: 8, color: { r: 255, g: 200, b: 50 }, coins: 2, shape: 'triangle' },
    TANK: { name: 'Джаггернаут', health: 120, speed: 0.9, damage: 20, size: 28, xp: 25, color: { r: 150, g: 50, b: 255 }, coins: 5, shape: 'hexagon' },
    SHOOTER: { name: 'Снайпер', health: 40, speed: 1.2, damage: 8, size: 18, xp: 15, color: { r: 50, g: 255, b: 100 }, coins: 3, shape: 'diamond', shoots: true, fireRate: 1800, bullets: 1 },
    SWARM: { name: 'Рой', health: 8, speed: 2.8, damage: 3, size: 9, xp: 3, color: { r: 200, g: 100, b: 255 }, coins: 1, shape: 'circle' },
    // НОВЫЕ ОБЫЧНЫЕ МОНСТРЫ
    GHOST: { name: 'Призрак', health: 30, speed: 2.2, damage: 10, size: 16, xp: 10, color: { r: 100, g: 255, b: 255 }, coins: 2, shape: 'triangle' },
    HEAVY_SHOOTER: { name: 'Гатлинг', health: 80, speed: 0.7, damage: 12, size: 22, xp: 30, color: { r: 255, g: 100, b: 0 }, coins: 6, shape: 'diamond', shoots: true, fireRate: 1000, bullets: 3 },
};

// АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ 20 БОССОВ!
const BOSS_NAMES = [
    'Пожиратель Звёзд', 'Кровавый Метеор', 'Неоновый Ужас', 'Космический Левиафан', 'Пустотный Странник',
    'Владыка Метеоритов', 'Император Роя', 'Темная Материя', 'Плазменный Голем', 'Квантовый Разрушитель',
    'Орбитальный Страж', 'Вестник Гибели', 'Астральный Дракон', 'Кибер-Циклоп', 'Сингулярность',
    'Магнитная Буря', 'Титан Галактики', 'Солнечный Жнец', 'Хранитель Бездны', 'ОМЕГА-АБСОЛЮТ'
];

for (let i = 1; i <= 20; i++) {
    ENEMY_TYPES['BOSS_' + i] = {
        name: BOSS_NAMES[i - 1],
        health: 400 + (i * 200), // Здоровье растет с каждым боссом
        speed: 0.6 + ((i % 3) * 0.2), // Разная скорость
        damage: 15 + (i * 3),
        size: 45 + ((i % 4) * 5),
        xp: 150 + (i * 50),
        color: { r: (i * 45) % 255, g: (i * 85) % 255, b: (i * 125) % 255 }, // Разные цвета
        coins: 40 + (i * 15),
        shape: 'boss',
        shoots: true,
        fireRate: Math.max(600, 2000 - (i * 60)), // Стреляют всё быстрее
        bullets: 1 + Math.floor(i / 3) // На поздних уровнях стреляют сразу по 5-7 пуль
    };
}

class Enemy {
    constructor(x, y, type, scaleFactor = 1) {
        this.id = enemyIdCounter++;
        this.x = x;
        this.y = y;
        this.type = type;
        const config = ENEMY_TYPES[type];
        this.name = config.name;
        
        this.maxHealth = config.health * scaleFactor;
        this.health = this.maxHealth;
        this.speed = config.speed;
        this.damage = config.damage * Math.max(1, scaleFactor * 0.5);
        this.size = config.size;
        this.xp = config.xp;
        this.color = { ...config.color };
        
        // Для призраков
        if (type === 'GHOST') this.color.a = 0.4;
        
        this.coins = config.coins;
        this.shape = config.shape;
        this.shoots = config.shoots || false;
        this.fireRate = config.fireRate || 2000;
        this.bullets = config.bullets || 1;
        this.lastShot = 0;
        
        this.alive = true;
        this.angle = 0;
        this.flash = 0;
        this.knockbackX = 0;
        this.knockbackY = 0;
        this.spawnAnim = 1;
    }

    update(playerX, playerY, now) {
        if (this.spawnAnim > 0) this.spawnAnim -= 0.05;

        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.hypot(dx, dy);
        this.angle = Math.atan2(dy, dx);

        // Если это снайпер, он не подходит вплотную
        const keepDistance = this.type === 'SHOOTER' ? 250 : this.size;

        if (dist > keepDistance) {
            this.x += (dx / dist) * this.speed + this.knockbackX;
            this.y += (dy / dist) * this.speed + this.knockbackY;
        } else if (dist < keepDistance - 20) {
            this.x -= (dx / dist) * this.speed * 0.5;
            this.y -= (dy / dist) * this.speed * 0.5;
        }

        this.knockbackX *= 0.85;
        this.knockbackY *= 0.85;

        if (this.flash > 0) this.flash -= 0.1;

        return this.alive;
    }

    takeDamage(damage, angle = 0) {
        this.health -= damage;
        this.flash = 1;
        
        // Боссы меньше отлетают от пуль
        const kbMult = this.shape === 'boss' ? 0.5 : 3;
        this.knockbackX = Math.cos(angle) * kbMult;
        this.knockbackY = Math.sin(angle) * kbMult;

        if (this.health <= 0) {
            this.alive = false;
            return true;
        }
        return false;
    }

    draw(ctx, cameraX, cameraY) {
        const sx = this.x - cameraX;
        const sy = this.y - cameraY;
        const scale = Math.max(0, 1 - this.spawnAnim);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(scale, scale);

        ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.6)`;
        ctx.shadowBlur = 20;

        const alpha = this.color.a || 1;
        if (this.flash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(alpha, this.flash)})`;
        } else {
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`;
        }

        this.drawShape(ctx);

        if (this.maxHealth > 40) {
            const barWidth = this.size * 2;
            const barHeight = 4;
            const healthPercent = Math.max(0, this.health / this.maxHealth);

            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(-barWidth / 2, -this.size - 12, barWidth, barHeight);

            const gradient = ctx.createLinearGradient(-barWidth / 2, 0, -barWidth / 2 + barWidth * healthPercent, 0);
            gradient.addColorStop(0, '#ff006e');
            gradient.addColorStop(1, '#ff4444');
            ctx.fillStyle = gradient;
            ctx.fillRect(-barWidth / 2, -this.size - 12, barWidth * healthPercent, barHeight);
            
            if (this.shape === 'boss') {
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.name, 0, -this.size - 16);
            }
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(Math.cos(this.angle) * this.size * 0.2, Math.sin(this.angle) * this.size * 0.2, this.size * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawShape(ctx) {
        switch (this.shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'triangle':
                ctx.beginPath();
                for (let i = 0; i < 3; i++) {
                    const angle = (i * Math.PI * 2) / 3 - Math.PI / 2 + this.angle;
                    ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(angle) * this.size, Math.sin(angle) * this.size);
                }
                ctx.closePath();
                ctx.fill();
                break;
            case 'hexagon':
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI * 2) / 6;
                    ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(angle) * this.size, Math.sin(angle) * this.size);
                }
                ctx.closePath();
                ctx.fill();
                break;
            case 'diamond':
                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.lineTo(this.size * 0.7, 0);
                ctx.lineTo(0, this.size);
                ctx.lineTo(-this.size * 0.7, 0);
                ctx.closePath();
                ctx.fill();
                break;
            case 'boss':
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = `rgba(${this.color.r + 30}, ${this.color.g + 30}, ${this.color.b + 30}, 0.8)`;
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI * 2) / 8 + Date.now() * 0.001;
                    ctx.save();
                    ctx.rotate(angle);
                    ctx.beginPath();
                    ctx.moveTo(this.size * 0.7, -5);
                    ctx.lineTo(this.size * 1.3, 0);
                    ctx.lineTo(this.size * 0.7, 5);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }

                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }
}

class EnemyBullet {
    constructor(x, y, angle, damage) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 4;
        this.damage = damage;
        this.size = 6;
        this.alive = true;
        this.distanceTraveled = 0;
        this.maxDistance = 600;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.distanceTraveled += this.speed;
        if (this.distanceTraveled > this.maxDistance) this.alive = false;
    }

    draw(ctx, cameraX, cameraY) {
        const sx = this.x - cameraX;
        const sy = this.y - cameraY;
        
        ctx.save();
        ctx.shadowColor = 'rgba(255, 50, 50, 0.8)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(sx, sy, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(sx, sy, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}