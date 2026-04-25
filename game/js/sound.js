/**
 * Sound — Web Audio API synthesizer with speed-reactive pitch
 * @module sound
 */

export class SoundEngine {
    constructor() {
        /** @type {AudioContext|null} */
        this.ctx = null;
        this.muted = false;
        this.masterVolume = 0.25;
        this._initialized = false;
    }

    init() {
        if (this._initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this._initialized = true;
        } catch (e) {
            console.warn('Web Audio API unavailable:', e);
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    _tone(freq, dur, type = 'sine', vol = 1) {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(this.masterVolume * vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + dur);
    }

    _noise(dur, vol = 0.2) {
        if (this.muted || !this.ctx) return;
        const size = this.ctx.sampleRate * dur;
        const buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.masterVolume * vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 1;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        src.start(this.ctx.currentTime);
    }

    paddleHit() {
        this._tone(440, 0.06, 'triangle', 0.4);
        this._tone(660, 0.04, 'sine', 0.2);
    }

    wallBounce() {
        this._tone(330, 0.03, 'sine', 0.2);
    }

    /**
     * Sound pitch varies with ball speed
     * @param {boolean} destroyed
     * @param {number} hp
     * @param {number} [speedMul=1] - Ball speed multiplier
     */
    brickHit(destroyed, hp = 1, speedMul = 1) {
        const baseFreq = (250 + hp * 80) * (0.8 + speedMul * 0.3);
        if (destroyed) {
            this._tone(baseFreq, 0.08, 'square', 0.3);
            this._tone(baseFreq * 1.5, 0.06, 'square', 0.15);
            this._noise(0.06, 0.1);
        } else {
            this._tone(baseFreq, 0.05, 'square', 0.2);
        }
    }

    comboHit(combo) {
        const freq = Math.min(1200, 400 + combo * 50);
        this._tone(freq, 0.08, 'sine', 0.35);
    }

    powerUp() {
        [523, 659, 784, 1047].forEach((freq, i) => {
            setTimeout(() => this._tone(freq, 0.12, 'sine', 0.35), i * 50);
        });
    }

    /** Gravity flip — deep whoosh */
    gravityFlip() {
        this._tone(100, 0.3, 'sine', 0.4);
        this._tone(200, 0.2, 'triangle', 0.3);
        this._noise(0.15, 0.15);
    }

    ballLost() {
        [440, 349, 294, 220].forEach((freq, i) => {
            setTimeout(() => this._tone(freq, 0.15, 'triangle', 0.35), i * 70);
        });
    }

    gameOver() {
        [392, 330, 294, 262, 220].forEach((freq, i) => {
            setTimeout(() => this._tone(freq, 0.25, 'triangle', 0.45), i * 130);
        });
    }

    win() {
        [523, 659, 784, 1047, 784, 1047].forEach((freq, i) => {
            setTimeout(() => this._tone(freq, i === 5 ? 0.4 : 0.12, 'sine', 0.45), i * 90);
        });
    }

    launch() {
        this._tone(200, 0.08, 'sine', 0.25);
        setTimeout(() => this._tone(400, 0.04, 'sine', 0.15), 40);
    }
}
