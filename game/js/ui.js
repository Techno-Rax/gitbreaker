/**
 * UI — HUD updates, screen management
 * @module ui
 */

/** @type {Object<string, HTMLElement>} */
const elements = {};

/** Cache DOM elements */
export function initUI() {
    elements.startScreen = document.getElementById('start-screen');
    elements.gameoverScreen = document.getElementById('gameover-screen');
    elements.winScreen = document.getElementById('win-screen');
    elements.pauseScreen = document.getElementById('pause-screen');
    elements.loadingScreen = document.getElementById('loading-screen');
    elements.hud = document.getElementById('hud');
    elements.hudScore = document.getElementById('hud-score');
    elements.hudLives = document.getElementById('hud-lives');
    elements.hudUsername = document.getElementById('hud-username');
    elements.hudCombo = document.getElementById('hud-combo');
    elements.finalScore = document.getElementById('final-score');
    elements.bricksDestroyed = document.getElementById('bricks-destroyed');
    elements.maxCombo = document.getElementById('max-combo');
    elements.winScore = document.getElementById('win-score');
    elements.winTime = document.getElementById('win-time');
    elements.usernameInput = document.getElementById('username-input');
    elements.soundToggle = document.getElementById('sound-toggle');
}

/** Show a specific screen, hide others */
export function showScreen(screenId) {
    const screens = ['start-screen', 'gameover-screen', 'win-screen', 'pause-screen', 'loading-screen'];
    for (const id of screens) {
        const el = document.getElementById(id);
        if (el) {
            if (id === screenId) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    }

    // Show/hide HUD
    if (screenId === null) {
        elements.hud?.classList.remove('hidden');
    }
}

/** Hide all overlays and show HUD */
export function hideAllScreens() {
    showScreen(null);
}

/** Show loading screen */
export function showLoading() {
    showScreen('loading-screen');
}

/** Update HUD score */
export function updateScore(score) {
    if (elements.hudScore) {
        elements.hudScore.textContent = score.toLocaleString();
    }
}

/** Update HUD lives */
export function updateLives(lives) {
    if (elements.hudLives) {
        elements.hudLives.textContent = '❤️'.repeat(Math.max(0, lives));
    }
}

/** Update HUD username */
export function updateUsername(username) {
    if (elements.hudUsername) {
        elements.hudUsername.textContent = username;
    }
}

/** Show combo counter */
export function showCombo(combo) {
    if (!elements.hudCombo) return;

    if (combo > 1) {
        elements.hudCombo.textContent = `x${combo}`;
        elements.hudCombo.classList.remove('hidden');
        // Re-trigger animation
        elements.hudCombo.style.animation = 'none';
        elements.hudCombo.offsetHeight; // Reflow
        elements.hudCombo.style.animation = '';
    } else {
        elements.hudCombo.classList.add('hidden');
    }
}

/**
 * Show game over screen with stats
 * @param {number} score
 * @param {number} destroyed
 * @param {number} maxComboVal
 */
export function showGameOver(score, destroyed, maxComboVal) {
    if (elements.finalScore) elements.finalScore.textContent = score.toLocaleString();
    if (elements.bricksDestroyed) elements.bricksDestroyed.textContent = destroyed;
    if (elements.maxCombo) elements.maxCombo.textContent = `x${maxComboVal}`;
    showScreen('gameover-screen');
    elements.hud?.classList.add('hidden');
}

/**
 * Show win screen with stats
 * @param {number} score
 * @param {number} elapsedSeconds
 */
export function showWin(score, elapsedSeconds) {
    if (elements.winScore) elements.winScore.textContent = score.toLocaleString();

    const mins = Math.floor(elapsedSeconds / 60);
    const secs = Math.floor(elapsedSeconds % 60);
    if (elements.winTime) elements.winTime.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

    showScreen('win-screen');
    elements.hud?.classList.add('hidden');
}

/** Get username from input */
export function getUsername() {
    return elements.usernameInput?.value?.trim() || 'anoojshete';
}

/** Update sound toggle button */
export function updateSoundButton(muted) {
    if (elements.soundToggle) {
        elements.soundToggle.textContent = muted ? '🔇' : '🔊';
    }
}
