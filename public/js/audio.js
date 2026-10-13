class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.musicGain = null;
        this.sfxGain = null;
        this.initialized = false;
        
        // Предохранители от спама звуками
        this.lastPlayerHit = 0;
        this.lastShootTime = 0;
    }

    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = 0.3;
            this.musicGain.connect(this.audioContext.destination);

            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = 0.4; // Чуть тише, чтобы не оглушало
            this.sfxGain.connect(this.audioContext.destination);

            this.initialized = true;
        } catch (e) {
            console.warn('Audio not supported');
        }
    }

    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.initialized) return;
        try {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = type;
            osc.frequency.value = frequency;
            
            gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start();
            osc.stop(this.audioContext.currentTime + duration);
        } catch (e) {}
    }

    playShoot() {
        const now = Date.now();
        // Защита от слишком частого звука при пулемете
        if (now - this.lastShootTime < 50) return; 
        this.lastShootTime = now;
        
        this.playTone(600 + Math.random()*200, 0.1, 'square', 0.1);
    }

    playHit() {
        const now = Date.now();
        // ЗАЩИТА ОТ БАГА ЗВУКА: Звук урона не чаще 1 раза в 0.4 секунды!
        if (now - this.lastPlayerHit < 400) return; 
        this.lastPlayerHit = now;
        
        this.playTone(150, 0.3, 'sawtooth', 0.25);
        setTimeout(() => this.playTone(100, 0.2, 'square', 0.2), 100);
    }

    playExplosion() {
        this.playTone(100 + Math.random()*50, 0.3, 'sawtooth', 0.15);
    }

    playPickup() {
        this.playTone(600, 0.1, 'sine', 0.15);
        setTimeout(() => this.playTone(800, 0.15, 'sine', 0.15), 50);
    }

    playLevelUp() {
        const notes = [440, 554, 659, 880]; // Красивый аккорд
        notes.forEach((note, i) => {
            setTimeout(() => this.playTone(note, 0.3, 'sine', 0.2), i * 150);
        });
    }

    playDeath() {
        this.playTone(300, 0.5, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(150, 0.5, 'sawtooth', 0.3), 300);
        setTimeout(() => this.playTone(50, 1.0, 'sawtooth', 0.3), 600);
    }

    playClick() {
        this.playTone(1200, 0.05, 'sine', 0.1);
    }
}

const audioManager = new AudioManager();