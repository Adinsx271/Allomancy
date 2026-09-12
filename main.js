"use strict";

const SCREEN_WIDTH = 816;
const SCREEN_HEIGHT = 480;
const TILE_SIZE = 32;
const FIXED_TIME_STEP = 1 / 60;
const MAX_FRAME_TIME = 0.25;
const METAL_RANGE = 520;
const HERO_SPAWN = [208, 544];
const AUTO_START = window.location.hash === "#play";

const canvas = document.getElementById("main_screen");
const context = canvas.getContext("2d");
const tiles = document.getElementById("tiles");
const titleScreen = document.getElementById("title-screen");
const layers = [
    document.getElementById("parallax-mountain-bg"),
    document.getElementById("parallax-mountain-montain-far"),
    document.getElementById("parallax-mountain-mountains"),
    document.getElementById("parallax-mountain-trees"),
    document.getElementById("parallax-mountain-foreground-trees"),
];
const heroSprites = {};
for (const state of ["idle", "run", "jump", "attack", "crouch", "hurt"]) {
    for (const direction of ["left", "right"]) {
        heroSprites[`${state}-${direction}`] = document.getElementById(`hero-${state}-${direction}`);
    }
}

const levels = loadLevels();
let currentLevel = levels[0];
const audioElement = document.getElementById("theAudio");
audioElement.volume = 0.01;

const game = {
    canvas,
    context,
    state: AUTO_START ? "playing" : "title",
    camera: {
        x: 0,
        y: Math.max(0, Math.min(HERO_SPAWN[1] - SCREEN_HEIGHT * 0.78, currentLevel.length * TILE_SIZE - SCREEN_HEIGHT)),
    },
    points: 0,
    gravity: 900,
    hero: new Hero(...HERO_SPAWN),
    selectedMetalIndex: null,
    metalRange: METAL_RANGE,
    metalActive: false,
    projectiles: [],
    levelIndex: 0,
    coinInventory: 5,
    elapsedTime: 0,
    audio: audioElement,
    audioStarted: false,
    debug: false,
};
game.hero.adjustRenderPos(game.camera.x, game.camera.y);
game.input = new InputController(canvas);

function startAudioFromUserGesture() {
    if (game.audioStarted || game.state !== "playing") return;
    game.audio.play().then(() => {
        game.audioStarted = true;
    }).catch(() => {});
}
window.addEventListener("keydown", startAudioFromUserGesture);
canvas.addEventListener("pointerdown", startAudioFromUserGesture);

let previousTime = performance.now();
let accumulatedTime = 0;
function animationLoop(currentTime) {
    const frameTime = Math.min((currentTime - previousTime) / 1000, MAX_FRAME_TIME);
    previousTime = currentTime;
    accumulatedTime += frameTime;
    while (accumulatedTime >= FIXED_TIME_STEP) {
        if (game.state === "playing") updateGame(game, FIXED_TIME_STEP);
        accumulatedTime -= FIXED_TIME_STEP;
    }
    renderCurrentState(game);
    requestAnimationFrame(animationLoop);
}

window.addEventListener("load", () => requestAnimationFrame(animationLoop));
