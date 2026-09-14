import { drawProjectiles, updateProjectiles } from "./coins.js";
import { SCREEN_HEIGHT, SCREEN_WIDTH, TILE_SIZE, GAMEPLAY } from "./gameConfig.js";
import { currentLevel, levels, setCurrentLevel, setGameState } from "./gameRuntime.js";
import { Hero } from "./hero.js";
import {
    drawLevelObjects,
    drawLevelTiles,
    getLevelMetadata,
    isSpriteGrounded,
    loadedLevelManifest,
    resetLevelObjects,
    updateLevelObjects,
} from "./level.js";
import { LevelCore } from "./levelCore.js";
import { drawMetalLinks, getMetalMode, updateMetalInteraction } from "./metal.js";

export function updateGame(game, deltaTime) {
    game.elapsedTime += deltaTime;
    game.hero.beginStep(deltaTime, currentLevel);
    game.input.update(game.hero, deltaTime);

    const metadata = getLevelMetadata(currentLevel);
    updateMetalInteraction(game, deltaTime);
    game.hero.update(deltaTime, currentLevel, game.gravity);
    updateProjectiles(game, deltaTime);
    updateLevelObjects(game);
    if (game.state !== "playing") return;

    if (game.hero.globalPos[1] > currentLevel.length * TILE_SIZE + 160) {
        setGameState(game, "gameOver");
        return;
    }
    const reachedGoal = metadata.goals.find((goal) => Math.hypot(
        game.hero.globalPos[0] - goal.position[0],
        game.hero.globalPos[1] - game.hero.size[1] / 2 - goal.position[1],
    ) < 58);
    if (reachedGoal) {
        const transition = LevelCore.resolveGoalTransition(reachedGoal, loadedLevelManifest);
        if (transition.kind === "level") {
            enterLevel(game, transition.levelIndex);
            return;
        }
        game.points = Math.max(100, 1500 - Math.floor(game.elapsedTime * 10));
        setGameState(game, "complete");
    }

    updateCamera(game, deltaTime);
    game.hero.adjustRenderPos(game.camera.x, game.camera.y);
}

function updateCamera(game, deltaTime) {
    const levelWidth = currentLevel[0].length * TILE_SIZE;
    const levelHeight = currentLevel.length * TILE_SIZE;
    const lookAhead = Math.max(-90, Math.min(90, game.hero.vel[0] * 0.3));
    const desiredX = game.hero.globalPos[0] - SCREEN_WIDTH * 0.43 + lookAhead;
    const desiredY = game.hero.globalPos[1] - SCREEN_HEIGHT * 0.78;
    const targetX = Math.max(0, Math.min(desiredX, levelWidth - SCREEN_WIDTH));
    const targetY = Math.max(0, Math.min(desiredY, levelHeight - SCREEN_HEIGHT));
    const smoothing = 1 - Math.exp(-7 * deltaTime);
    game.camera.x += (targetX - game.camera.x) * smoothing;
    game.camera.y += (targetY - game.camera.y) * smoothing;
}

export function renderCurrentState(game) {
    if (game.state === "title") {
        renderTitleScreen(game);
        return;
    }
    renderGame(game);
    if (game.state === "paused") renderMessageOverlay(game.context, "Pause", "Esc: fortsetzen · R: Neustart");
    if (game.state === "gameOver") renderMessageOverlay(game.context, "Gefallen", "R: erneut versuchen");
    if (game.state === "complete") renderMessageOverlay(game.context, "Demo abgeschlossen", `${game.points} Punkte · R: erneut spielen`);
}

function renderGame(game) {
    const { context } = game;
    context.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    drawParallax(context, game.layers, game.camera.x, game.camera.y);
    drawLevelTiles(context, game.tiles, currentLevel, game.camera.x, game.camera.y);
    drawLevelObjects(context, game.tiles, currentLevel, game.camera.x, game.camera.y);
    drawGoals(context, game);
    drawMetalLinks(context, game);
    drawProjectiles(context, game);
    game.hero.draw(context, game.heroSprites);
    drawHud(context, game);
}

function drawParallax(context, layers, cameraX, cameraY) {
    context.drawImage(layers[0], 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    for (let index = 1; index < layers.length; index++) {
        const parallaxX = -((cameraX * (0.015 * Math.pow(2, index))) % SCREEN_WIDTH);
        const parallaxY = -cameraY * (0.015 * index);
        context.drawImage(layers[index], parallaxX, parallaxY, SCREEN_WIDTH, SCREEN_HEIGHT);
        context.drawImage(layers[index], parallaxX + SCREEN_WIDTH, parallaxY, SCREEN_WIDTH, SCREEN_HEIGHT);
    }
}

function drawGoals(context, game) {
    for (const goal of getLevelMetadata(currentLevel).goals) {
        const x = goal.position[0] - game.camera.x;
        const y = goal.position[1] - game.camera.y;
        context.save();
        context.strokeStyle = "#f7e36d";
        context.lineWidth = 3;
        context.shadowColor = "#f7e36d";
        context.shadowBlur = 12;
        context.strokeRect(x - 17, y - 17, 34, 34);
        context.restore();
    }
}

function drawHud(context, game) {
    const mode = getMetalMode(game.hero);
    const modeLabel = mode === "pull" ? "ZIEHEN" : mode === "push" ? "STOSSEN" : "AUS";
    const modeColor = mode === "pull" ? "#52b7ff" : mode === "push" ? "#ff6f61" : "#d6d6d6";
    context.save();
    context.fillStyle = "rgba(12, 15, 24, 0.78)";
    context.fillRect(12, 12, 270, 202);
    context.fillStyle = "white";
    context.font = "bold 18px system-ui, sans-serif";
    context.fillText(`LEVEL ${game.levelIndex + 1}/${levels.length} · ${game.points} PTS`, 24, 38);
    context.fillStyle = modeColor;
    context.fillText(`ALLOMANTIE: ${modeLabel}`, 24, 64);
    context.fillStyle = "#d7dbe7";
    context.font = "13px system-ui, sans-serif";
    context.fillText(`MÜNZEN: ${game.coinInventory}`, 24, 84);
    const targetLabel = !game.input.pointerDown
        ? "MT4/MT5 über Metall halten"
        : game.metalActive ? "Kraft aktiv" : `Kein Ziel im ${game.metalAimTolerance}°-Zielkegel`;
    context.fillText(targetLabel, 24, 106);
    const arts = game.hero.metalArts;
    const ironMode = arts.ironMode === "storing" ? "LEICHT" : arts.ironMode === "tapping" ? "SCHWER" : "NORMAL";
    const steelMode = arts.steelMode === "storing" ? "SPEICHERN" : arts.steelMode === "tapping" ? "ABRUFEN" : "NORMAL";
    drawResourceBar(context, 24, 124, 242, arts.ironReserve, arts.ironMax, "#70b9d8", `EISEN – ${ironMode}`);
    drawResourceBar(context, 24, 153, 242, arts.steelReserve, arts.steelMax, "#b9d9e8", `STAHL – ${steelMode}`);
    drawResourceBar(context, 24, 182, 242, arts.pewterReserve, arts.pewterMax, "#b778e6", `WEISSBLECH${arts.pewterActive ? " – AKTIV" : ""}`);
    context.fillStyle = "rgba(12, 15, 24, 0.72)";
    context.fillRect(SCREEN_WIDTH - 394, 12, 382, 92);
    context.fillStyle = "#f2f2f2";
    context.fillText("A/D Laufen · W Springen · Leertaste Nahkampf · Strg Münze", SCREEN_WIDTH - 384, 32);
    context.fillText("MT4 Ziehen · MT5 Stoßen · Q/E Gewicht umschalten", SCREEN_WIDTH - 384, 52);
    context.fillText("C/Shift Tempo umschalten · 1 Weißblech umschalten", SCREEN_WIDTH - 384, 72);
    context.fillText("Esc Pause · R Neustart", SCREEN_WIDTH - 384, 92);
    context.restore();
}

function drawResourceBar(context, x, y, width, value, maximum, color, label) {
    context.fillStyle = "#d7dbe7";
    context.font = "11px system-ui, sans-serif";
    context.fillText(label, x, y);
    context.fillStyle = "rgba(255, 255, 255, 0.14)";
    context.fillRect(x, y + 5, width, 8);
    context.fillStyle = color;
    context.fillRect(x, y + 5, width * (value / maximum), 8);
}

function renderTitleScreen(game) {
    const { context } = game;
    context.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    context.drawImage(game.titleScreen, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    context.fillStyle = "rgba(8, 10, 18, 0.58)";
    context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    context.textAlign = "center";
    context.fillStyle = "#f3e7c3";
    context.font = "bold 68px Georgia, serif";
    context.fillText("ALLOMANCY", SCREEN_WIDTH / 2, 165);
    context.font = "20px system-ui, sans-serif";
    context.fillStyle = "white";
    context.fillText("Nutze Metall, um den leuchtenden Ausgang zu erreichen.", SCREEN_WIDTH / 2, 220);
    context.fillStyle = "#f7e36d";
    context.font = "bold 24px system-ui, sans-serif";
    context.fillText("ENTER zum Starten", SCREEN_WIDTH / 2, 292);
    context.fillStyle = "#d7dbe7";
    context.font = "16px system-ui, sans-serif";
    context.fillText("Leertaste: Nahkampf · Strg: Münze · MT4: Ziehen · MT5: Stoßen", SCREEN_WIDTH / 2, 334);
    context.font = "14px system-ui, sans-serif";
    context.fillText("Q/E: Gewicht · C/Shift: Tempo · 1: Weißblech", SCREEN_WIDTH / 2, 365);
    context.textAlign = "start";
}

function renderMessageOverlay(context, title, subtitle) {
    context.fillStyle = "rgba(5, 7, 13, 0.72)";
    context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    context.textAlign = "center";
    context.fillStyle = "white";
    context.font = "bold 46px Georgia, serif";
    context.fillText(title, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 12);
    context.fillStyle = "#f7e36d";
    context.font = "20px system-ui, sans-serif";
    context.fillText(subtitle, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 38);
    context.textAlign = "start";
}

export function startGame(game) {
    resetGame(game);
}

function enterLevel(game, levelIndex) {
    if (levelIndex < 0 || levelIndex >= levels.length) throw new Error(`Ungültiger Levelindex: ${levelIndex}`);
    game.input.releaseMetalTarget();
    game.input.resetAbilityToggles();
    game.levelIndex = levelIndex;
    setCurrentLevel(levels[levelIndex]);
    resetLevelObjects(currentLevel);
    const spawnPosition = getLevelMetadata(currentLevel).spawnPosition;
    game.hero = new Hero(...spawnPosition);
    game.selectedMetalIndex = null;
    game.metalActive = false;
    game.projectiles = [];
    game.camera.x = 0;
    game.camera.y = Math.max(
        0,
        Math.min(spawnPosition[1] - SCREEN_HEIGHT * 0.78, currentLevel.length * TILE_SIZE - SCREEN_HEIGHT),
    );
    game.hero.isGrounded = isSpriteGrounded(game.hero, currentLevel);
    game.hero.adjustRenderPos(game.camera.x, game.camera.y);
}

export function resetGame(game) {
    game.input.releaseMetalTarget();
    enterLevel(game, game.startLevelIndex);
    game.coinInventory = GAMEPLAY.startingCoins;
    game.points = 0;
    game.elapsedTime = 0;
    setGameState(game, "playing");
}
