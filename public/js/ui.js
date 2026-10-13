class UI {
    constructor() {
        this.damageNumbers = [];
    }

    showScreen(screenId) {
        const overlays = ['upgrade-screen', 'pause-screen', 'gameover-screen', 'leaderboard-screen'];
        if (overlays.includes(screenId)) {
            const screen = document.getElementById(screenId);
            if (screen) screen.classList.add('active');
        } else {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            const screen = document.getElementById(screenId);
            if (screen) screen.classList.add('active');
        }
    }

    hideScreen(screenId) {
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.remove('active');
        
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen && window.game && (window.game.gameState === 'playing' || window.game.gameState === 'upgrading')) {
            gameScreen.classList.add('active');
        }
    }

    updateHUD(player, gameTime) {
        const maxHP = player.maxHealth + player.maxHealthBonus;
        const healthPercent = Math.max(0, Math.min(100, (player.health / maxHP) * 100));
        const healthBar = document.getElementById('health-bar');
        if (healthBar) healthBar.style.width = healthPercent + '%';
        
        const healthText = document.getElementById('health-text');
        if (healthText) healthText.textContent = `${Math.ceil(player.health)}/${maxHP}`;

        const xpPercent = Math.max(0, Math.min(100, (player.xp / player.xpToNext) * 100));
        const xpBar = document.getElementById('xp-bar');
        if (xpBar) xpBar.style.width = xpPercent + '%';

        const xpText = document.getElementById('xp-text');
        if (xpText) xpText.textContent = `Lv.${player.level}`;

        const scoreVal = document.getElementById('score-value');
        if (scoreVal) scoreVal.textContent = this.formatNumber(player.score);

        const killVal = document.getElementById('kill-value');
        if (killVal) killVal.textContent = this.formatNumber(player.kills);

        const timeVal = document.getElementById('time-value');
        if (timeVal) {
            const minutes = Math.floor(gameTime / 60);
            const seconds = Math.floor(gameTime % 60);
            timeVal.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateWeaponsDisplay(weapons) {
        const container = document.getElementById('weapons-display');
        if (!container) return;
        container.innerHTML = '';
        weapons.forEach(w => {
            const div = document.createElement('div');
            div.className = 'weapon-icon';
            const config = typeof WEAPON_TYPES !== 'undefined' ? WEAPON_TYPES[w.type] : null;
            const icon = config ? config.icon : '⚔️';
            div.innerHTML = `${icon}<br><small>Lv${w.level}</small>`;
            container.appendChild(div);
        });
    }

    showUpgradeOptions(options, callback) {
        const container = document.getElementById('upgrade-options');
        if (!container) return;
        container.innerHTML = '';
        
        this.showScreen('upgrade-screen');

        options.forEach(option => {
            const div = document.createElement('div');
            div.className = 'upgrade-option';
            
            const rarityClass = `rarity-${option.rarity || 'common'}`;
            
            div.innerHTML = `
                <span class="icon">${option.icon}</span>
                <div class="info">
                    <div class="name">${option.name}</div>
                    <div class="desc">${option.description}</div>
                </div>
                <span class="rarity ${rarityClass}">${(option.rarity || 'common').toUpperCase()}</span>
            `;

            div.addEventListener('click', () => {
                audioManager.playClick();
                this.hideScreen('upgrade-screen');
                callback(option);
            });

            container.appendChild(div);
        });
    }

    showGameOver(stats) {
        const container = document.getElementById('gameover-stats');
        if (container) {
            container.innerHTML = `
                <div class="gameover-stat">
                    <span class="label">Счёт</span>
                    <span class="value" style="color: #ffd700">${this.formatNumber(stats.score)}</span>
                </div>
                <div class="gameover-stat">
                    <span class="label">Убийства</span>
                    <span class="value" style="color: #ff006e">${stats.kills}</span>
                </div>
                <div class="gameover-stat">
                    <span class="label">Время</span>
                    <span class="value" style="color: #00d4ff">${stats.time}</span>
                </div>
                <div class="gameover-stat">
                    <span class="label">Уровень</span>
                    <span class="value" style="color: #7b2ff7">${stats.level}</span>
                </div>
                <div class="gameover-stat">
                    <span class="label">Монеты</span>
                    <span class="value" style="color: #ffd700">+${stats.coinsEarned}</span>
                </div>
                <div class="gameover-stat">
                    <span class="label">Лучший</span>
                    <span class="value" style="color: #00ff88">${this.formatNumber(stats.bestScore)}</span>
                </div>
            `;
        }
        this.showScreen('gameover-screen');
    }

    showDamageNumber(x, y, damage, isCrit = false) {
        const div = document.createElement('div');
        div.className = 'damage-number';
        div.textContent = Math.round(damage);
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.color = isCrit ? '#ffd700' : '#ff4444';
        div.style.fontSize = isCrit ? '24px' : '16px';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 800);
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    initMenuParticles() {
        const container = document.getElementById('menu-particles');
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'menu-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDuration = (5 + Math.random() * 10) + 's';
            particle.style.animationDelay = Math.random() * 5 + 's';
            particle.style.width = (2 + Math.random() * 3) + 'px';
            particle.style.height = particle.style.width;
            
            const colors = ['rgba(123, 47, 247, 0.6)', 'rgba(0, 212, 255, 0.6)', 'rgba(255, 0, 110, 0.4)'];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            container.appendChild(particle);
        }
    }

    initShop(playerData, callback) {
        const grid = document.getElementById('shop-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const items = [
            { id: 'ship_tank',     name: 'Крейсер',      icon: '🛡️', price: 500,  desc: 'Много HP',            stackable: false },
            { id: 'ship_striker',  name: 'Штурмовик',    icon: '💥', price: 1000, desc: '+50% урона',          stackable: false },
            { id: 'perk_magnet',   name: 'Магнит+',      icon: '🧲', price: 300,  desc: '+15% радиус сбора',   stackable: true  },
            { id: 'perk_regen',    name: 'Регенерация',  icon: '💚', price: 400,  desc: '+0.5 HP/сек',         stackable: true  },
            { id: 'perk_xp',       name: 'Опыт+',        icon: '⭐', price: 350,  desc: '+10% опыта',          stackable: true  },
            { id: 'perk_armor',    name: 'Броня',        icon: '🔰', price: 600,  desc: '-1 урона',            stackable: true  },
            { id: 'perk_speed',    name: 'Двигатели',    icon: '🔥', price: 250,  desc: '+5% скорости',        stackable: true  },
            { id: 'perk_luck',     name: 'Удача',        icon: '🍀', price: 800,  desc: '+3% шанс лута',       stackable: true  },
        ];

        const purchases = Array.isArray(playerData.purchases) ? playerData.purchases : [];
        const coins = playerData.coins || 0;

        const getCount = (id) => purchases.filter(x => x === id).length;
        const getNextPrice = (item) => {
            if (!item.stackable) return item.price;
            return Math.floor(item.price * Math.pow(1.15, getCount(item.id)));
        };

        const coinsEl = document.getElementById('shop-coins-value');
        if (coinsEl) coinsEl.textContent = coins;

        items.forEach(item => {
            const count = getCount(item.id);
            const nextPrice = getNextPrice(item);
            const soldOut = !item.stackable && count > 0;
            const canBuy = !soldOut && coins >= nextPrice;

            const div = document.createElement('div');
            div.className = 'shop-item' + (soldOut ? ' purchased' : '');
            if (!canBuy && !soldOut) div.style.opacity = '0.6';

            div.innerHTML = `
                <span class="item-icon">${item.icon}</span>
                <span class="item-name">${item.name}</span>
                <span class="item-desc" style="font-size:11px;color:#8892b0">${item.desc}</span>
                ${item.stackable ? `<span class="item-desc" style="font-size:11px;color:#00d4ff">Уровень: ${count}</span>` : ''}
                <span class="item-price">${soldOut ? '✓ Куплено' : '💰 ' + nextPrice}</span>
            `;

            if (!soldOut) {
                div.addEventListener('click', () => callback(item));
            }

            grid.appendChild(div);
        });
    }

    initCharacterSelect(playerData, callback) {
        const grid = document.getElementById('characters-grid');
        if (!grid) return;
        grid.innerHTML = '';

        if (typeof SHIP_TYPES === 'undefined') return;

        Object.entries(SHIP_TYPES).forEach(([key, ship]) => {
            const unlocked = ship.unlocked || playerData.purchases?.includes('ship_' + key.toLowerCase());
            const div = document.createElement('div');
            div.className = 'character-card' + (unlocked ? '' : ' locked');
            div.innerHTML = `
                <div class="character-preview" style="background: radial-gradient(circle, rgba(${ship.color.r},${ship.color.g},${ship.color.b},0.3), transparent)">${ship.icon}</div>
                <div class="character-name">${ship.name}</div>
                <div class="character-desc">${ship.desc}</div>
                <div class="character-desc">HP: ${ship.health} | SPD: ${ship.speed}</div>
                ${!unlocked ? '<div style="color:#ff006e;font-size:11px">🔒 Магазин</div>' : ''}
            `;
            if (unlocked) {
                div.addEventListener('click', () => {
                    audioManager.playClick();
                    callback(key);
                });
            }
            grid.appendChild(div);
        });
    }

    showLeaderboard(entries) {
        const container = document.getElementById('leaderboard-list');
        if (!container) return;
        container.innerHTML = '';

        if (!entries || entries.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#8892b0">Загрузка данных...</div>';
        } else {
            entries.forEach(item => {
                const row = document.createElement('div');
                const rankClass = item.rank <= 3 ? `rank-${item.rank}` : '';
                const medal = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`;
                
                row.className = `leaderboard-row ${rankClass}`;
                row.innerHTML = `
                    <span class="leaderboard-rank">${medal}</span>
                    <span class="leaderboard-name">${item.name}</span>
                    <span class="leaderboard-score">${this.formatNumber(item.score)}</span>
                `;
                container.appendChild(row);
            });
        }
        this.showScreen('leaderboard-screen');
    }
}