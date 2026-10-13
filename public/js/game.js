class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ui = new UI();
        this.particles = new ParticleSystem();
        this.starField = null;
        this.gridBg = new GridBackground();

        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.enemyBullets = [];
        this.xpOrbs = [];
        this.powerups = [];
        
        this.gameState = 'menu';
        this.gameTime = 0;
        this.frameCount = 0;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.spawnTimer = 0;
        this.difficulty = 1;
        this.bossSpawned = false;
        this.wave = 0;
        this.currentBossIndex = 1;

        this.cameraX = 0;
        this.cameraY = 0;

        this.keys = {};
        this.inputX = 0;
        this.inputY = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseDown = false;
        this.joystickActive = false;

        this.playerData = {
            bestScore: 0,
            totalGames: 0,
            coins: 0,
            purchases: [],
            selectedShip: 'FIGHTER',
        };

        this.init();
    }

    async init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.starField = new StarField(this.canvas.width, this.canvas.height);
        
        this.setupInput();
        this.ui.initMenuParticles();

        await yandexSDK.init();

        const savedData = await yandexSDK.loadData();
        if (savedData) this.playerData = { ...this.playerData, ...savedData };

        this.updateMenuStats();
        this.setupMenuButtons();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.starField) {
            this.starField = new StarField(this.canvas.width, this.canvas.height);
        }
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Escape') this.togglePause();
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        window.addEventListener('mousedown', (e) => { if (e.button === 0) this.isMouseDown = true; });
        window.addEventListener('mouseup', (e) => { if (e.button === 0) this.isMouseDown = false; });

        const joystickBase = document.getElementById('joystick-base');
        const joystickStick = document.getElementById('joystick-stick');

        if (joystickBase) {
            joystickBase.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.joystickActive = true;
                const rect = joystickBase.getBoundingClientRect();
                this.joystickStartX = rect.left + rect.width / 2;
                this.joystickStartY = rect.top + rect.height / 2;
                audioManager.init();
            });

            window.addEventListener('touchmove', (e) => {
                if (!this.joystickActive) return;
                e.preventDefault();
                const touch = e.touches[0];
                const dx = touch.clientX - this.joystickStartX;
                const dy = touch.clientY - this.joystickStartY;
                const dist = Math.min(Math.hypot(dx, dy), 45);
                const angle = Math.atan2(dy, dx);

                const stickX = Math.cos(angle) * dist;
                const stickY = Math.sin(angle) * dist;

                if (joystickStick) joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;
                this.inputX = stickX / 45;
                this.inputY = stickY / 45;
            }, { passive: false });

            window.addEventListener('touchend', () => {
                this.joystickActive = false;
                this.inputX = 0;
                this.inputY = 0;
                if (joystickStick) joystickStick.style.transform = 'translate(0, 0)';
            });
        }
        window.addEventListener('click', () => audioManager.init(), { once: true });
    }

    processInput() {
        let ix = this.inputX;
        let iy = this.inputY;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) iy -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) iy += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) ix -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) ix += 1;
        return { x: ix, y: iy };
    }

    setupMenuButtons() {
        document.getElementById('play-btn').addEventListener('click', () => {
            audioManager.init();
            audioManager.playClick();
            this.ui.initCharacterSelect(this.playerData, (shipType) => this.startGame(shipType));
            this.ui.showScreen('character-select');
        });

        document.getElementById('back-to-menu').addEventListener('click', () => {
            audioManager.playClick();
            this.ui.showScreen('main-menu');
        });

        document.getElementById('shop-btn').addEventListener('click', () => {
            audioManager.playClick();
            this.ui.initShop(this.playerData, (item) => this.buyItem(item));
            this.ui.showScreen('shop-screen');
        });

        document.getElementById('back-from-shop').addEventListener('click', () => {
            audioManager.playClick();
            this.updateMenuStats();
            this.ui.showScreen('main-menu');
        });

        const lbBtn = document.getElementById('leaderboard-btn');
        if (lbBtn) {
            lbBtn.addEventListener('click', async () => {
                audioManager.playClick();
                const entries = await yandexSDK.getLeaderboardEntries();
                this.ui.showLeaderboard(entries);
            });
        }

        const backLbBtn = document.getElementById('back-from-leaderboard');
        if (backLbBtn) {
            backLbBtn.addEventListener('click', () => {
                audioManager.playClick();
                this.ui.hideScreen('leaderboard-screen');
            });
        }

        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('resume-btn').addEventListener('click', () => { audioManager.playClick(); this.togglePause(); });
        document.getElementById('quit-btn').addEventListener('click', () => { audioManager.playClick(); this.endGame(); });
        document.getElementById('retry-btn').addEventListener('click', () => { audioManager.playClick(); this.startGame(this.playerData.selectedShip); });
        
        document.getElementById('home-btn').addEventListener('click', () => {
            audioManager.playClick();
            this.ui.showScreen('main-menu');
            this.gameState = 'menu';
        });

        document.getElementById('ad-revive-btn').addEventListener('click', async () => {
            audioManager.playClick();
            const rewarded = await yandexSDK.showRewardedAd();
            if (rewarded) this.revivePlayer();
        });
    }

    updateMenuStats() {
        document.getElementById('best-score').textContent = this.ui.formatNumber(this.playerData.bestScore);
        document.getElementById('total-games').textContent = this.playerData.totalGames;
    }
getPurchaseCount(itemId) {
    if (!Array.isArray(this.playerData.purchases)) return 0;

    return this.playerData.purchases.filter(id => id === itemId).length;
}

getShopItemPrice(item) {
    const count = this.getPurchaseCount(item.id);

    // Каждая следующая копия дороже на 15%
    return Math.floor(item.price * Math.pow(1.15, count));
}

    getPurchaseCount(itemId) {
        if (!Array.isArray(this.playerData.purchases)) return 0;
        return this.playerData.purchases.filter(id => id === itemId).length;
    }

    getShopItemPrice(item) {
        if (!item.stackable) return item.price;
        const count = this.getPurchaseCount(item.id);
        return Math.floor(item.price * Math.pow(1.15, count));
    }
    buyItem(item) {
        if (!item || !item.id) return;

        if (!Array.isArray(this.playerData.purchases)) {
            this.playerData.purchases = [];
        }

        // Корабли — только один раз
        if (!item.stackable && this.playerData.purchases.includes(item.id)) {
            audioManager.playClick();
            return;
        }

        const price = this.getShopItemPrice(item);
        if ((this.playerData.coins || 0) < price) {
            audioManager.playClick();
            return;
        }

        this.playerData.coins -= price;
        this.playerData.purchases.push(item.id);

        audioManager.playPickup();
        this.saveData();
        this.ui.initShop(this.playerData, (i) => this.buyItem(i));
    }
    startGame(shipType) {
        this.playerData.selectedShip = shipType;
        this.player = new Player(shipType);
        
        this.player.fireRateMult = 1;
        this.player.rangeMult = 1;
        this.player.areaMult = 1;
        this.player.critChance = 0.1;

                this.player.luckBonus = 0;

        if (Array.isArray(this.playerData.purchases)) {
            const magnetLevel = this.getPurchaseCount('perk_magnet');
            const regenLevel  = this.getPurchaseCount('perk_regen');
            const xpLevel     = this.getPurchaseCount('perk_xp');
            const armorLevel  = this.getPurchaseCount('perk_armor');
            const speedLevel  = this.getPurchaseCount('perk_speed');
            const luckLevel   = this.getPurchaseCount('perk_luck');

            this.player.magnetRange    *= 1 + magnetLevel * 0.15; // было +50% один раз
            this.player.regenRate      += regenLevel * 0.5;       // было +1
            this.player.xpMultiplier   *= 1 + xpLevel * 0.10;     // было +25%
            this.player.armorBonus     += armorLevel;             // было +2
            this.player.speed          *= 1 + speedLevel * 0.05;  // было +15%
            this.player.luckBonus      += luckLevel * 0.03;       // новое, слабое
        }

        this.enemies = [];
        this.projectiles = [];
        this.enemyBullets = [];
        this.xpOrbs = [];
        this.powerups = [];
        this.particles.clear();

        this.gameTime = 0;
        this.frameCount = 0;
        this.spawnTimer = 0;
        this.difficulty = 1;
        this.bossSpawned = false;
        this.currentBossIndex = 1;
        this.wave = 0;
        this.bossMessage = { text: '', time: 0 };

        this.gameState = 'playing';
        this.ui.showScreen('game-screen');
        this.ui.updateWeaponsDisplay(this.player.weapons);
        yandexSDK.gameplayStart();
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.ui.showScreen('pause-screen');
            document.getElementById('pause-time').textContent = document.getElementById('time-value').textContent;
            document.getElementById('pause-score').textContent = this.player.score;
            document.getElementById('pause-kills').textContent = this.player.kills;
            yandexSDK.gameplayStop();
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.ui.hideScreen('pause-screen');
            this.ui.showScreen('game-screen');
            yandexSDK.gameplayStart();
        }
    }

    endGame() {
        this.gameState = 'gameover';
        yandexSDK.gameplayStop();

        const coinsEarned = Math.floor(this.player.score / 10) + this.player.coins;
        this.playerData.coins = (this.playerData.coins || 0) + coinsEarned;
        this.playerData.totalGames = (this.playerData.totalGames || 0) + 1;

        if (this.player.score > this.playerData.bestScore) {
            this.playerData.bestScore = this.player.score;
            yandexSDK.setScore(this.player.score);
        }

        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);

        this.ui.showGameOver({
            score: this.player.score,
            kills: this.player.kills,
            time: `${minutes}:${seconds.toString().padStart(2, '0')}`,
            level: this.player.level,
            coinsEarned,
            bestScore: this.playerData.bestScore,
        });

        this.saveData();
        audioManager.playDeath();
    }

    revivePlayer() {
        this.player.health = this.player.maxHealth + this.player.maxHealthBonus;
        this.player.alive = true;
        this.player.invincible = 180;
        this.gameState = 'playing';
        this.ui.hideScreen('gameover-screen');
        this.ui.showScreen('game-screen');

        this.enemies.forEach(e => {
            const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
            if (dist < 200) {
                e.alive = false;
                this.particles.explosion(e.x, e.y, e.color, 15);
            }
        });
        this.enemies = this.enemies.filter(e => e.alive);
        yandexSDK.gameplayStart();
    }

    async saveData() {
        await yandexSDK.saveData(this.playerData);
    }

    gameLoop(timestamp) {
        this.deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        if (this.gameState === 'playing') {
            this.gameTime += this.deltaTime;
            this.frameCount++;
            this.update();
        }

        this.render();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update() {
        const input = this.processInput();
        this.player.update(input.x, input.y);

        if (!this.joystickActive) {
            const mouseWorldX = this.mouseX + this.cameraX;
            const mouseWorldY = this.mouseY + this.cameraY;
            this.player.angle = Math.atan2(mouseWorldY - this.player.y, mouseWorldX - this.player.x);
        }

        const camLerp = 0.1;
        this.cameraX += (this.player.x - this.canvas.width / 2 - this.cameraX) * camLerp;
        this.cameraY += (this.player.y - this.canvas.height / 2 - this.cameraY) * camLerp;

        // Быстрый рост сложности (каждые 40 секунд +1 уровень)
        this.difficulty = 1 + this.gameTime / 40;

        this.spawnEnemies();

        const now = Date.now();
        this.enemies.forEach(enemy => {
            enemy.update(this.player.x, this.player.y, now);

            if (enemy.shoots && now - enemy.lastShot > enemy.fireRate) {
                enemy.lastShot = now;
                const baseAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
                
                // Боссы стреляют сразу несколькими пулями
                for(let b=0; b < enemy.bullets; b++) {
                    let shootAngle = baseAngle;
                    if(enemy.bullets > 1) {
                        shootAngle = baseAngle + (b - (enemy.bullets-1)/2) * 0.2;
                    }
                    this.enemyBullets.push(new EnemyBullet(enemy.x, enemy.y, shootAngle, enemy.damage));
                }
            }

            const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
            if (dist < enemy.size + this.player.size) {
                const died = this.player.takeDamage(enemy.damage);
                audioManager.playHit();
                this.particles.explosion(this.player.x, this.player.y, { r: 255, g: 100, b: 100 }, 8);
                if (died) this.endGame();
            }
        });

        this.player.weapons.forEach(weapon => {
            if (weapon.config.orbital) {
                const orbitRadius = weapon.config.range * (this.player.rangeMult || 1);
                const count = weapon.config.count;
                const projSize = weapon.config.projectileSize * (this.player.areaMult || 1);

                for (let i = 0; i < count; i++) {
                    const angle = (now * 0.003) + (i * Math.PI * 2) / count;
                    const ox = this.player.x + Math.cos(angle) * orbitRadius;
                    const oy = this.player.y + Math.sin(angle) * orbitRadius;

                    this.enemies.forEach(enemy => {
                        const dist = Math.hypot(ox - enemy.x, oy - enemy.y);
                        if (dist < projSize + enemy.size) {
                            const killed = enemy.takeDamage(weapon.config.damage * this.player.damageMultiplier);
                            if (killed) this.onEnemyKilled(enemy);
                        }
                    });
                }
            }
        });

        this.autoFire(now);

        this.projectiles.forEach(proj => {
            proj.update(this.enemies);

            this.enemies.forEach(enemy => {
                if (!proj.alive) return;
                if (proj.hitEnemies.has(enemy.id)) return;
                
                const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
                if (dist < proj.size + enemy.size) {
                    const angle = Math.atan2(enemy.y - proj.y, enemy.x - proj.x);
                    const isCrit = Math.random() < (this.player.critChance || 0.1);
                    const damage = proj.damage * this.player.damageMultiplier * (isCrit ? 2 : 1);
                    const killed = enemy.takeDamage(damage, angle);
                    
                    proj.hitEnemies.add(enemy.id);
                    proj.onHit();
                    
                    this.particles.explosion(enemy.x, enemy.y, enemy.color, 5);
                    audioManager.playHit();

                    const screenX = enemy.x - this.cameraX;
                    const screenY = enemy.y - this.cameraY;
                    this.ui.showDamageNumber(screenX, screenY - 20, damage, isCrit);

                    if (killed) this.onEnemyKilled(enemy);
                }
            });

            this.particles.trail(proj.x, proj.y, proj.color);
        });

        this.enemyBullets.forEach(bullet => {
            bullet.update();
            const dist = Math.hypot(bullet.x - this.player.x, bullet.y - this.player.y);
            if (dist < bullet.size + this.player.size) {
                bullet.alive = false;
                const died = this.player.takeDamage(bullet.damage);
                audioManager.playHit();
                this.particles.explosion(this.player.x, this.player.y, { r: 255, g: 100, b: 100 }, 5);
                if (died) this.endGame();
            }
        });

        this.xpOrbs.forEach(orb => {
            orb.update(this.player.x, this.player.y, this.player.magnetRange);
            if (orb.collected) {
                const leveledUp = this.player.addXP(orb.value);
                this.player.score += orb.value;
                this.particles.xpPickup(orb.x, orb.y);
                audioManager.playPickup();
                if (leveledUp) this.onLevelUp();
            }
        });

        this.powerups.forEach(pu => {
            const result = pu.update(this.player.x, this.player.y);
            if (result) {
                this.applyPowerup(result);
                audioManager.playPickup();
            }
        });

        this.enemies = this.enemies.filter(e => e.alive);
        this.projectiles = this.projectiles.filter(p => p.alive);
        this.enemyBullets = this.enemyBullets.filter(b => b.alive);
        this.xpOrbs = this.xpOrbs.filter(o => o.alive);
        this.powerups = this.powerups.filter(p => p.alive);

        this.particles.update();
        this.ui.updateHUD(this.player, this.gameTime);
    }

    spawnEnemies() {
        this.spawnTimer += this.deltaTime;
        const spawnInterval = Math.max(0.2, 1.5 - this.difficulty * 0.1);
        
        if (this.spawnTimer >= spawnInterval) {
            this.spawnTimer = 0;
            this.wave++;

            const count = Math.min(2 + Math.floor(this.difficulty * 0.8), 12);
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 600 + Math.random() * 200;
                const x = this.player.x + Math.cos(angle) * dist;
                const y = this.player.y + Math.sin(angle) * dist;

                let type = 'GRUNT';
                const roll = Math.random();

                if (this.difficulty >= 8 && roll < 0.05) type = 'HEAVY_SHOOTER';
                else if (this.difficulty >= 6 && roll < 0.1) type = 'GHOST';
                else if (this.difficulty >= 4 && roll < 0.15) type = 'SHOOTER';
                else if (this.difficulty >= 3 && roll < 0.2) type = 'TANK';
                else if (this.difficulty >= 2 && roll < 0.3) type = 'FAST';
                else if (roll < 0.25) type = 'SWARM';

                this.enemies.push(new Enemy(x, y, type, this.difficulty));
            }

            // БОСС КАЖДУЮ 1 МИНУТУ (Вместо 2 минут)
            if (Math.floor(this.gameTime) % 60 === 0 && this.gameTime > 10 && !this.bossSpawned) {
                this.bossSpawned = true;
                setTimeout(() => { this.bossSpawned = false; }, 5000);
                
                if(this.currentBossIndex > 20) this.currentBossIndex = 20;
                
                const bossType = 'BOSS_' + this.currentBossIndex;
                const angle = Math.random() * Math.PI * 2;
                const newBoss = new Enemy(
                    this.player.x + Math.cos(angle) * 700,
                    this.player.y + Math.sin(angle) * 700,
                    bossType, 1 // Боссы уже имеют скалирование в самом классе
                );
                
                this.enemies.push(newBoss);
                
                // Показываем текст на экране
                this.bossMessage = { text: `ВНИМАНИЕ! ${newBoss.name.toUpperCase()} ПРИБЛИЖАЕТСЯ!`, time: 180 };
                audioManager.playLevelUp(); // Звук сирены
                
                this.currentBossIndex++;
            }
        }
    }

    autoFire(now) {
        const shouldFire = this.isMouseDown || this.joystickActive;

        this.player.weapons.forEach(weapon => {
            if (weapon.config.orbital) return;

            const currentFireRate = weapon.config.fireRate * (this.player.fireRateMult || 1);
            if (now - weapon.lastFired < currentFireRate) return;

            if (weapon.config.lightning) {
                if (shouldFire || !this.joystickActive) this.fireLightning(weapon, now);
                return;
            }

            let targetAngle = this.player.angle;
            if (this.joystickActive && this.enemies.length > 0) {
                let closest = null;
                let closestDist = weapon.config.range * (this.player.rangeMult || 1);
                this.enemies.forEach(e => {
                    const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
                    if (d < closestDist) {
                        closest = e;
                        closestDist = d;
                    }
                });
                if (closest) {
                    targetAngle = Math.atan2(closest.y - this.player.y, closest.x - this.player.x);
                }
            }

            if (!shouldFire && !this.joystickActive) return;

            weapon.lastFired = now;
            const count = weapon.config.count;
            const spread = weapon.config.spread || 0;

            for (let i = 0; i < count; i++) {
                let angle = targetAngle;
                if (count > 1 && spread) {
                    angle = targetAngle - spread / 2 + (spread / (count - 1)) * i;
                } else if (count > 1) {
                    angle = targetAngle + (i - (count - 1) / 2) * 0.15;
                }

                const proj = new Projectile(
                    this.player.x + Math.cos(angle) * 20,
                    this.player.y + Math.sin(angle) * 20,
                    angle, weapon, this.player
                );
                
                proj.range = weapon.config.range * (this.player.rangeMult || 1);
                proj.size = weapon.config.projectileSize * (this.player.areaMult || 1);
                this.projectiles.push(proj);
            }
            audioManager.playShoot();
        });
    }

    fireLightning(weapon, now) {
        weapon.lastFired = now;
        
        let target = null;
        let minDist = weapon.config.range * (this.player.rangeMult || 1);
        
        this.enemies.forEach(e => {
            const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
            if (d < minDist) {
                target = e;
                minDist = d;
            }
        });

        if (!target) return;

        const chainTargets = [target];
        let lastTarget = target;

        for (let i = 0; i < (weapon.config.chain || 3); i++) {
            let nextTarget = null;
            let nextDist = 150 * (this.player.rangeMult || 1);
            this.enemies.forEach(e => {
                if (chainTargets.includes(e)) return;
                const d = Math.hypot(e.x - lastTarget.x, e.y - lastTarget.y);
                if (d < nextDist) {
                    nextTarget = e;
                    nextDist = d;
                }
            });
            if (nextTarget) {
                chainTargets.push(nextTarget);
                lastTarget = nextTarget;
            }
        }

        let prevX = this.player.x;
        let prevY = this.player.y;
        chainTargets.forEach(t => {
            const killed = t.takeDamage(weapon.config.damage * this.player.damageMultiplier, Math.atan2(t.y - prevY, t.x - prevX));
            
            for (let i = 0; i < 5; i++) {
                const t2 = i / 5;
                const lx = prevX + (t.x - prevX) * t2 + (Math.random() - 0.5) * 20;
                const ly = prevY + (t.y - prevY) * t2 + (Math.random() - 0.5) * 20;
                this.particles.emit(lx, ly, 1, {
                    speed: 0.5, life: 0.3, size: 3 * (this.player.areaMult || 1), color: weapon.config.color, glow: true,
                });
            }
            if (killed) this.onEnemyKilled(t);
            prevX = t.x;
            prevY = t.y;
        });
        audioManager.playShoot();
    }

    onEnemyKilled(enemy) {
        this.player.kills++;
        this.player.score += enemy.xp * 2;
        this.player.coins += enemy.coins;

        const orbCount = Math.ceil(enemy.xp / 5);
        for (let i = 0; i < orbCount; i++) {
            this.xpOrbs.push(new XPOrb(
                enemy.x + (Math.random() - 0.5) * 30,
                enemy.y + (Math.random() - 0.5) * 30,
                Math.ceil(enemy.xp / orbCount)
            ));
        }

        if (Math.random() < 0.05 + (this.player.luckBonus || 0)) {
            const types = Object.keys(POWERUP_TYPES);
            const type = types[Math.floor(Math.random() * types.length)];
            this.powerups.push(new PowerUp(enemy.x, enemy.y, type));
        }

        this.particles.explosion(enemy.x, enemy.y, enemy.color, enemy.shape === 'boss' ? 50 : 20);
        audioManager.playExplosion();
    }

    applyPowerup(type) {
        switch (type) {
            case 'HEALTH': this.player.health = Math.min(this.player.maxHealth + this.player.maxHealthBonus, this.player.health + 30); break;
            case 'XP_BOOST': this.player.xpMultiplier = 2; this.player.xpMultiplierTimer = 600; break;
            case 'MAGNET': this.xpOrbs.forEach(orb => { if (Math.hypot(orb.x - this.player.x, orb.y - this.player.y) < 500) { orb.x = this.player.x; orb.y = this.player.y; } }); break;
            case 'BOMB':
                this.enemies.forEach(e => {
                    if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < 400) {
                        const killed = e.takeDamage(150);
                        this.particles.explosion(e.x, e.y, e.color, 10);
                        if (killed) this.onEnemyKilled(e);
                    }
                });
                this.particles.explosion(this.player.x, this.player.y, { r: 255, g: 200, b: 0 }, 50);
                break;
            case 'SHIELD': this.player.shieldActive = true; this.player.shieldTimer = 600; break;
            case 'SPEED': this.player.speedBoostTimer = 480; break;
        }
    }

    onLevelUp() {
        if (this.gameState === 'upgrading') return;
        audioManager.playLevelUp();
        this.gameState = 'upgrading';
        yandexSDK.gameplayStop();

        try {
            const options = this.generateUpgradeOptions();
            this.ui.showUpgradeOptions(options, (option) => {
                try { this.applyUpgrade(option); } catch (err) { console.warn('Upgrade error:', err); }
                this.gameState = 'playing';
                yandexSDK.gameplayStart();
            });
        } catch (err) {
            console.warn('LevelUp error:', err);
            this.gameState = 'playing';
        }
    }

    generateUpgradeOptions() {
        const allOptions = [];

        if (this.player && this.player.weapons) {
            this.player.weapons.forEach(w => {
                if (w && w.level < 8 && WEAPON_TYPES[w.type]) {
                    allOptions.push({
                        type: 'weapon_upgrade', weaponType: w.type,
                        name: `${WEAPON_TYPES[w.type].name} Lv.${w.level + 1}`,
                        icon: WEAPON_TYPES[w.type].icon,
                        description: `Улучшить ${WEAPON_TYPES[w.type].name}`,
                        rarity: w.level >= 5 ? 'epic' : w.level >= 3 ? 'rare' : 'common',
                    });
                }
            });

            if (this.player.weapons.length < 5) {
                const ownedTypes = this.player.weapons.map(w => w.type);
                Object.keys(WEAPON_TYPES).forEach(type => {
                    if (!ownedTypes.includes(type)) {
                        allOptions.push({
                            type: 'new_weapon', weaponType: type,
                            name: WEAPON_TYPES[type].name, icon: WEAPON_TYPES[type].icon,
                            description: WEAPON_TYPES[type].description, rarity: 'rare',
                        });
                    }
                });
            }
        }

        const stats = [
            { type: 'stat', stat: 'maxHealth', name: 'Здоровье +20', icon: '❤️', description: 'Макс. здоровье', rarity: 'common' },
            { type: 'stat', stat: 'speed', name: 'Скорость +10%', icon: '👟', description: 'Быстрее летаешь', rarity: 'common' },
            { type: 'stat', stat: 'armor', name: 'Броня +1', icon: '🛡️', description: 'Снижает урон', rarity: 'common' },
            { type: 'stat', stat: 'regen', name: 'Реген +1', icon: '💚', description: '+1 HP в сек.', rarity: 'rare' },
            { type: 'stat', stat: 'magnet', name: 'Магнит +30%', icon: '🧲', description: 'Радиус сбора', rarity: 'common' },
            { type: 'stat', stat: 'fireRate', name: 'Скорость огня +15%', icon: '⚡', description: 'Оружие стреляет быстрее', rarity: 'rare' },
            { type: 'stat', stat: 'range', name: 'Дальность +25%', icon: '🔭', description: 'Снаряды летят дальше', rarity: 'common' },
            { type: 'stat', stat: 'damage', name: 'Урон +15%', icon: '💪', description: 'Больше базового урона', rarity: 'rare' },
            { type: 'stat', stat: 'area', name: 'Радиус атак +20%', icon: '💥', description: 'Снаряды крупнее', rarity: 'common' },
            { type: 'stat', stat: 'crit', name: 'Шанс крита +10%', icon: '🎯', description: 'Частые желтые цифры', rarity: 'epic' },
        ];
        allOptions.push(...stats);

        const shuffled = allOptions.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3);
    }

    applyUpgrade(option) {
        if (!option) return;
        switch (option.type) {
            case 'weapon_upgrade':
                const weapon = this.player.weapons.find(w => w.type === option.weaponType);
                if (weapon) weapon.levelUp();
                break;
            case 'new_weapon':
                if (WEAPON_TYPES[option.weaponType]) this.player.weapons.push(new Weapon(option.weaponType));
                break;
            case 'stat':
                switch (option.stat) {
                    case 'maxHealth': this.player.maxHealthBonus += 20; this.player.health += 20; break;
                    case 'speed': this.player.speedBonus += this.player.baseSpeed * 0.1; break;
                    case 'armor': this.player.armorBonus += 1; break;
                    case 'regen': this.player.regenRate += 1; break;
                    case 'magnet': this.player.magnetRange *= 1.3; break;
                    case 'fireRate': this.player.fireRateMult *= 0.85; break;
                    case 'range': this.player.rangeMult *= 1.25; break;
                    case 'damage': this.player.damageMultiplier *= 1.15; break;
                    case 'area': this.player.areaMult *= 1.20; break;
                    case 'crit': this.player.critChance += 0.10; break;
                }
                break;
        }
        this.ui.updateWeaponsDisplay(this.player.weapons);
    }

    drawOrbitalWeapons(ctx, cameraX, cameraY, time) {
        const sx = this.player.x - cameraX;
        const sy = this.player.y - cameraY;

        this.player.weapons.forEach(weapon => {
            if (weapon.config.orbital) {
                const orbitRadius = weapon.config.range * (this.player.rangeMult || 1);
                const count = weapon.config.count;
                const projSize = weapon.config.projectileSize * (this.player.areaMult || 1);

                for (let i = 0; i < count; i++) {
                    const angle = (time * 0.003) + (i * Math.PI * 2) / count;
                    const ox = sx + Math.cos(angle) * orbitRadius;
                    const oy = sy + Math.sin(angle) * orbitRadius;

                    ctx.save();
                    ctx.shadowColor = `rgba(${weapon.config.color.r}, ${weapon.config.color.g}, ${weapon.config.color.b}, 0.8)`;
                    ctx.shadowBlur = 15;
                    ctx.fillStyle = `rgb(${weapon.config.color.r}, ${weapon.config.color.g}, ${weapon.config.color.b})`;
                    ctx.beginPath();
                    ctx.arc(ox, oy, projSize, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.beginPath();
                    ctx.arc(ox, oy, projSize * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        });
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, w, h);

        if (this.gameState === 'menu' || this.gameState === 'gameover') return;
        if (this.gameState !== 'playing' && this.gameState !== 'paused' && this.gameState !== 'upgrading') return;

        this.starField.draw(ctx, this.cameraX, this.cameraY, this.gameTime);
        this.gridBg.draw(ctx, this.cameraX, this.cameraY, w, h);

        this.xpOrbs.forEach(orb => orb.draw(ctx, this.cameraX, this.cameraY));
        this.powerups.forEach(pu => pu.draw(ctx, this.cameraX, this.cameraY));
        this.enemies.forEach(enemy => enemy.draw(ctx, this.cameraX, this.cameraY));
        this.enemyBullets.forEach(b => b.draw(ctx, this.cameraX, this.cameraY));

        if (this.player) {
            this.player.draw(ctx, this.cameraX, this.cameraY);
            this.drawOrbitalWeapons(ctx, this.cameraX, this.cameraY, Date.now());
        }

        this.projectiles.forEach(proj => proj.draw(ctx, this.cameraX, this.cameraY));
        this.particles.draw(ctx);
        this.drawVignette(ctx, w, h);

        // ОТРИСОВКА СООБЩЕНИЯ О БОССЕ
        if (this.bossMessage && this.bossMessage.time > 0) {
            this.bossMessage.time--;
            ctx.fillStyle = `rgba(255, 0, 80, ${Math.min(1, this.bossMessage.time / 60)})`;
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(255,0,0,0.8)';
            ctx.shadowBlur = 20;
            ctx.fillText(this.bossMessage.text, w / 2, h / 4);
            ctx.shadowBlur = 0; // Сброс тени
        }

        if (this.player && this.player.health < (this.player.maxHealth + this.player.maxHealthBonus) * 0.3) {
            const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 0.1;
            ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
            ctx.fillRect(0, 0, w, h);
        }
    }

    drawVignette(ctx, w, h) {
        const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});