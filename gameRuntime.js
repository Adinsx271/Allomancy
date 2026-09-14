export let levels = [];
export let currentLevel = null;
export let game = null;

export function setLevels(nextLevels) {
    levels = nextLevels;
}

export function setCurrentLevel(level) {
    currentLevel = level;
}

export function setGame(nextGame) {
    game = nextGame;
}

export function setGameState(targetGame, state) {
    targetGame.state = state;
    if (["paused", "gameOver", "complete", "title"].includes(state)) targetGame.audio.pause();
    if (state === "playing" && targetGame.audioStarted) targetGame.audio.play().catch(() => {});
}
