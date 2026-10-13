class YandexSDK {
    constructor() {
        this.sdk = null;
        this.player = null;
        this.leaderboard = null;
        this.initialized = false;
    }

    async init() {
        try {
            if (typeof YaGames !== 'undefined') {
                this.sdk = await YaGames.init();
                console.log('✅ Yandex SDK initialized');
                this.initialized = true;

                try {
                    this.player = await this.sdk.getPlayer({ scopes: false });
                } catch (e) {
                    console.warn('Player not authorized');
                }

                try {
                    this.leaderboard = await this.sdk.getLeaderboards();
                } catch (e) {
                    console.warn('Leaderboards not available');
                }

                this.sdk.features.LoadingAPI?.ready();
            }
        } catch (e) {
            console.warn('Yandex SDK dev mode');
        }
    }

    async saveData(data) {
        if (!this.initialized || !this.player) {
            localStorage.setItem('cosmic_survivor_data', JSON.stringify(data));
            return;
        }
        try {
            await this.player.setData(data);
        } catch (e) {
            localStorage.setItem('cosmic_survivor_data', JSON.stringify(data));
        }
    }

    async loadData() {
        if (!this.initialized || !this.player) {
            const data = localStorage.getItem('cosmic_survivor_data');
            return data ? JSON.parse(data) : null;
        }
        try {
            return await this.player.getData();
        } catch (e) {
            const data = localStorage.getItem('cosmic_survivor_data');
            return data ? JSON.parse(data) : null;
        }
    }

    async setScore(score) {
        if (!this.leaderboard) return;
        try {
            await this.leaderboard.setLeaderboardScore('main', score);
        } catch (e) {
            console.warn('Could not set score');
        }
    }

    async getLeaderboardEntries() {
        if (this.initialized && this.leaderboard) {
            try {
                const res = await this.leaderboard.getLeaderboardEntries('main', { quantityTop: 10 });
                return res.entries.map(e => ({
                    rank: e.rank,
                    name: e.player.publicName || 'Космонавт',
                    score: e.score
                }));
            } catch (e) {
                console.warn('Leaderboard fetch error:', e);
            }
        }

        // Данные для локального теста
        const savedData = localStorage.getItem('cosmic_survivor_data');
        const bestScore = savedData ? (JSON.parse(savedData).bestScore || 0) : 0;

        const fakeData = [
            { rank: 1, name: 'Starlight_Ace 🚀', score: 150000 },
            { rank: 2, name: 'CosmicRider ⚡', score: 98400 },
            { rank: 3, name: 'VoidWalker 🛡️', score: 74200 },
            { rank: 4, name: 'AstroNova ✨', score: 51000 },
            { rank: 5, name: 'Вы (Текущий рекорд)', score: bestScore },
        ];

        fakeData.sort((a, b) => b.score - a.score);
        fakeData.forEach((item, index) => item.rank = index + 1);
        return fakeData;
    }

    async showRewardedAd() {
        if (!this.initialized) return true; // Локальный тест
        try {
            return new Promise((resolve) => {
                this.sdk.adv.showRewardedVideo({
                    callbacks: {
                        onRewarded: () => resolve(true),
                        onClose: () => resolve(false),
                        onError: () => resolve(false),
                    }
                });
            });
        } catch (e) {
            return false;
        }
    }

    async showInterstitialAd() {
        if (!this.initialized) return;
        try {
            this.sdk.adv.showFullscreenAdv({ callbacks: {} });
        } catch (e) {}
    }

    gameplayStart() {
        if (this.initialized) {
            try { this.sdk.features.GameplayAPI?.start(); } catch(e) {}
        }
    }

    gameplayStop() {
        if (this.initialized) {
            try { this.sdk.features.GameplayAPI?.stop(); } catch(e) {}
        }
    }
}

const yandexSDK = new YandexSDK();