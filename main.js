"use strict";

import { FIXED_TIME_STEP, GAMEPLAY, MAX_FRAME_TIME, SCREEN_HEIGHT, SCREEN_WIDTH, TILE_SIZE } from "./gameConfig.js";
import { renderCurrentState, updateGame } from "./gameStates.js";
import { currentLevel, game, setCurrentLevel, setGame, setLevels } from "./gameRuntime.js";
import { Hero } from "./hero.js";
import { InputController } from "./inputs.js";
import { getLevelMetadata, loadedLevelManifest, loadLevels } from "./level.js";

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
for (const direction of ["left", "right"]) {
    heroSprites[`coinThrow-${direction}`] = document.getElementById(`hero-coin-throw-${direction}`);
}

const audioElement = document.getElementById("theAudio");
audioElement.volume = 0.01;

async function initializeGame() {
    const loadedLevels = await loadLevels();
    setLevels(loadedLevels);
    const startLevelIndex = loadedLevels.findIndex(
        (level) => getLevelMetadata(level).fileName === loadedLevelManifest.startLevel,
    );
    setCurrentLevel(loadedLevels[startLevelIndex]);
    const spawnPosition = getLevelMetadata(currentLevel).spawnPosition;
    setGame({
        canvas,
        context,
        tiles,
        titleScreen,
        layers,
        heroSprites,
        state: AUTO_START ? "playing" : "title",
        camera: createInitialCamera(currentLevel, spawnPosition),
        points: 0,
        gravity: GAMEPLAY.gravity,
        hero: new Hero(...spawnPosition),
        selectedMetalIndex: null,
        metalRange: GAMEPLAY.metalRange,
        metalAimTolerance: GAMEPLAY.metalAimTolerance,
        metalActive: false,
        projectiles: [],
        levelIndex: startLevelIndex,
        startLevelIndex,
        coinInventory: GAMEPLAY.startingCoins,
        elapsedTime: 0,
        audio: audioElement,
        audioStarted: false,
        debug: false,
    });
    game.hero.adjustRenderPos(game.camera.x, game.camera.y);
    game.input = new InputController(canvas);
}

function createInitialCamera(level, spawnPosition) {
    return {
        x: 0,
        y: Math.max(
            0,
            Math.min(spawnPosition[1] - SCREEN_HEIGHT * 0.78, level.length * TILE_SIZE - SCREEN_HEIGHT),
        ),
    };
}

function startAudioFromUserGesture() {
    if (!game || game.audioStarted || game.state !== "playing") return;
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

function renderLoadError(error) {
    context.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    context.fillStyle = "#10131d";
    context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    context.fillStyle = "#ff8b80";
    context.font = "bold 24px system-ui, sans-serif";
    context.fillText("Level konnten nicht geladen werden.", 40, 80);
    context.fillStyle = "white";
    context.font = "16px system-ui, sans-serif";
    context.fillText(error.message, 40, 116);
    console.error(error);
}

window.addEventListener("load", async () => {
    try {
        await initializeGame();
        requestAnimationFrame(animationLoop);
    } catch (error) {
        renderLoadError(error);
    }
});
