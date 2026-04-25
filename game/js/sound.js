/**
 * Sound — Web Audio API synthesizer (no external files needed)
 * @module sound
 */

export class SoundEngine {
    constructor() {
        /** @type {AudioContext|null} */
        this.ctx = null;
        this.muted = false;
        this.masterVolume = 0.3;
        this._initialized = false;
    }

    /** Initialize AudioContext (must be triggered by user interaction) */
    init() {
        if (this._initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this._initialized = true;
        } catch (e) {
            console.warn('Web Audio API not available:', e);
        }
    }

    /** Toggle mute */
    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    /**
     * Play a tone
     * @param {number} frequency - Hz
     * @param {number} duration - seconds
     * @param {string} type - 'sine'|'square'|'triangle'|'sawtooth'
     * @param {number} [volume=1] - 0–1
     */
    _playTone(frequency, duration, type = 'sine', volume = 1) {
        if (this.muted || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.value = frequency;

        gain.gain.setValueAtTime(this.masterVolume * volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }

    /**
     * Play noise burst
     * @param {number} duration
     * @param {number} volume
     */
    _playNoise(duration, volume = 0.3) {
        if (this.muted || !this.ctx) return;

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.masterVolume * volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        // Bandpass filter for a more pleasant sound
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 1;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        source.start(this.ctx.currentTime);
    }

    /** Paddle hit — short crisp blip */
    paddleHit() {
        this._playTone(440, 0.08, 'triangle', 0.5);
        this._playTone(660, 0.06, 'sine', 0.3);
    }

    /** Wall bounce — soft click */
    wallBounce() {
        this._playTone(330, 0.04, 'sine', 0.25);
    }

    /**
     * Brick hit/break — crunch with pitch variation
     * @param {boolean} destroyed - Whether brick was fully destroyed
     * @param {number} hp - Brick HP before hit
     */
    brickHit(destroyed, hp = 1) {
        const baseFreq = 300 + hp * 100;

        if (destroyed) {
            // Destruction sound
            this._playTone(baseFreq, 0.1, 'square', 0.35);
            this._playTone(baseFreq * 1.5, 0.08, 'square', 0.2);
            this._playNoise(0.08, 0.15);
        } else {
            // Damage sound
            this._playTone(baseFreq, 0.06, 'square', 0.25);
        }
    }

    /**
     * Combo hit — ascending pitch
     * @param {number} combo - Current combo count
     */
    comboHit(combo) {
        const baseFreq = 400 + combo * 50;
        this._playTone(Math.min(baseFreq, 1200), 0.1, 'sine', 0.4);
    }

    /** Power-up collected — ascending arpeggio */
    powerUp() {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this._playTone(freq, 0.15, 'sine', 0.4);
            }, i * 60);
        });
    }

    /** Ball lost — descending tone */
    ballLost() {
        const notes = [440, 349, 294, 220];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this._playTone(freq, 0.2, 'triangle', 0.4);
            }, i * 80);
        });
    }

    /** Game over — sad descending */
    gameOver() {
        const notes = [392, 330, 294, 262, 220];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this._playTone(freq, 0.3, 'triangle', 0.5);
            }, i * 150);
        });
    }

    /** Win — triumphant fanfare */
    win() {
        const notes = [523, 659, 784, 1047, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this._playTone(freq, i === notes.length - 1 ? 0.5 : 0.15, 'sine', 0.5);
            }, i * 100);
        });
    }

    /** Launch ball — subtle whoosh */
    launch() {
        this._playTone(200, 0.1, 'sine', 0.3);
        setTimeout(() => this._playTone(400, 0.05, 'sine', 0.2), 50);
    }
}
