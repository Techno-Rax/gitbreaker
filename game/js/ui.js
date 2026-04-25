/**
 * UI — HUD, screens, score pop animation, gravity indicator
 * @module ui
 */

const el = {};

export function initUI() {
    el.startScreen = document.getElementById('start-screen');
    el.gameoverScreen = document.getElementById('gameover-screen');
    el.winScreen = document.getElementById('win-screen');
    el.pauseScreen = document.getElementById('pause-screen');
    el.loadingScreen = document.getElementById('loading-screen');
    el.hud = document.getElementById('hud');
    el.hudScore = document.getElementById('hud-score');
    el.hudLives = document.getElementById('hud-lives');
    el.hudUsername = document.getElementById('hud-username');
    el.hudCombo = document.getElementById('hud-combo');
    el.hudGravity = document.getElementById('hud-gravity');
    el.finalScore = document.getElementById('final-score');
    el.bricksDestroyed = document.getElementById('bricks-destroyed');
    el.maxCombo = document.getElementById('max-combo');
    el.winScore = document.getElementById('win-score');
    el.winTime = document.getElementById('win-time');
    el.usernameInput = document.getElementById('username-input');
    el.soundToggle = document.getElementById('sound-toggle');
    el.headerStatus = document.getElementById('header-status-text');
    el.canvasContainer = document.getElementById('canvas-container');
    el.brickTooltip = document.getElementById('brick-tooltip');
}

export function showScreen(screenId) {
    const screens = ['start-screen', 'gameover-screen', 'win-screen', 'pause-screen', 'loading-screen'];
    for (const id of screens) {
        const e = document.getElementById(id);
        if (e) e.classList.toggle('hidden', id !== screenId);
    }
    if (screenId === null) el.hud?.classList.remove('hidden');
}

export function hideAllScreens() { showScreen(null); }
export function showLoading() { showScreen('loading-screen'); }

/** Update score with pop animation */
export function updateScore(score) {
    if (!el.hudScore) return;
    el.hudScore.textContent = score.toLocaleString();
    // Trigger pop animation
    el.hudScore.classList.remove('pop');
    void el.hudScore.offsetWidth; // Reflow
    el.hudScore.classList.add('pop');
}

export function updateLives(lives) {
    if (el.hudLives) el.hudLives.textContent = '❤️'.repeat(Math.max(0, lives));
}

export function updateUsername(username) {
    if (el.hudUsername) el.hudUsername.textContent = username;
}

export function showCombo(combo) {
    if (!el.hudCombo) return;
    if (combo > 1) {
        el.hudCombo.textContent = `x${combo}`;
        el.hudCombo.classList.remove('hidden');
        el.hudCombo.style.animation = 'none';
        void el.hudCombo.offsetHeight;
        el.hudCombo.style.animation = '';
    } else {
        el.hudCombo.classList.add('hidden');
    }
}

/** Update gravity HUD indicator */
export function updateGravity(dir) {
    if (!el.hudGravity) return;
    if (dir > 0) {
        el.hudGravity.innerHTML = '<span>▼</span> GRAVITY';
        el.hudGravity.classList.remove('inverted');
    } else {
        el.hudGravity.innerHTML = '<span>▲</span> ANTI-GRAV';
        el.hudGravity.classList.add('inverted');
    }
}

/** Trigger canvas tilt effect */
export function triggerGravityFlip(inverted) {
    if (!el.canvasContainer) return;
    el.canvasContainer.classList.add('gravity-flip');
    el.canvasContainer.classList.toggle('tilt-inverted', inverted);
    el.canvasContainer.classList.toggle('tilt-normal', !inverted);
    setTimeout(() => el.canvasContainer.classList.remove('gravity-flip'), 400);
}

/** Update header status text */
export function setStatus(text) {
    if (el.headerStatus) el.headerStatus.textContent = text;
}

/** Show brick tooltip */
export function showBrickTooltip(brick, canvasRect, scaleX, scaleY) {
    if (!el.brickTooltip || !brick?.meta) {
        hideBrickTooltip();
        return;
    }

    const date = new Date(brick.meta.date);
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const count = brick.meta.count;
    el.brickTooltip.textContent = `${count} commit${count !== 1 ? 's' : ''} on ${formatted}`;

    // Position tooltip
    const bx = brick.x / scaleX + canvasRect.left;
    const by = brick.y / scaleY + canvasRect.top;
    el.brickTooltip.style.left = `${bx}px`;
    el.brickTooltip.style.top = `${by - 28}px`;
    el.brickTooltip.classList.add('visible');
}

export function hideBrickTooltip() {
    el.brickTooltip?.classList.remove('visible');
}

export function showGameOver(score, destroyed, maxComboVal) {
    if (el.finalScore) el.finalScore.textContent = score.toLocaleString();
    if (el.bricksDestroyed) el.bricksDestroyed.textContent = destroyed;
    if (el.maxCombo) el.maxCombo.textContent = `x${maxComboVal}`;
    showScreen('gameover-screen');
    el.hud?.classList.add('hidden');
    setStatus('process killed');
}

export function showWin(score, elapsed) {
    if (el.winScore) el.winScore.textContent = score.toLocaleString();
    const m = Math.floor(elapsed / 60);
    const s = Math.floor(elapsed % 60);
    if (el.winTime) el.winTime.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    showScreen('win-screen');
    el.hud?.classList.add('hidden');
    setStatus('graph cleared');
}

export function getUsername() {
    return el.usernameInput?.value?.trim() || 'techno-rax';
}

export function updateSoundButton(muted) {
    if (el.soundToggle) el.soundToggle.textContent = muted ? '🔇' : '🔊';
}
