import { SCREEN_HEIGHT, SCREEN_WIDTH, TILE_SIZE } from "./gameConfig.js";
import { currentLevel, setGameState } from "./gameRuntime.js";
import { LevelCore } from "./levelCore.js";

const TILE_EMPTY = LevelCore.TILE_EMPTY;
const TILE_SOLID = LevelCore.TILE_SOLID;
const levelMetadata = new WeakMap();
export let loadedLevelManifest = null;

function drawTile(context, tiles, x, y, tileIndex) {
    const sourceX = TILE_SIZE * (tileIndex % 64);
    const sourceY = TILE_SIZE * Math.floor(tileIndex / 64);
    context.drawImage(tiles, sourceX, sourceY, TILE_SIZE, TILE_SIZE, x, y, TILE_SIZE, TILE_SIZE);
}

export function drawLevelTiles(context, tiles, level, cameraX, cameraY) {
    const visualTiles = getLevelMetadata(level).visualTiles;
    const firstColumn = Math.max(0, Math.floor(cameraX / TILE_SIZE));
    const lastColumn = Math.min(level[0].length, Math.ceil((cameraX + SCREEN_WIDTH) / TILE_SIZE) + 1);
    const firstRow = Math.max(0, Math.floor(cameraY / TILE_SIZE));
    const lastRow = Math.min(level.length, Math.ceil((cameraY + SCREEN_HEIGHT) / TILE_SIZE) + 1);
    for (let row = firstRow; row < lastRow; row++) {
        for (let column = firstColumn; column < lastColumn; column++) {
            if (level[row][column] !== TILE_SOLID) continue;
            drawTile(
                context,
                tiles,
                column * TILE_SIZE - cameraX,
                row * TILE_SIZE - cameraY,
                visualTiles[row][column] ?? LevelCore.DEFAULT_SOLID_TILE,
            );
        }
    }
}

export function drawLevelObjects(context, tiles, level, cameraX, cameraY) {
    for (const object of getLevelMetadata(level).objects) {
        if (object.type === "door" && object.open) continue;
        const x = object.x * TILE_SIZE - cameraX;
        const y = object.y * TILE_SIZE - cameraY;
        if (x < -TILE_SIZE || y < -TILE_SIZE || x > SCREEN_WIDTH || y > SCREEN_HEIGHT) continue;
        drawTile(context, tiles, x, y, object.tile);
        drawObjectState(context, object, x, y);
    }
}

function drawObjectState(context, object, x, y) {
    context.save();
    if (object.type === "switch") {
        context.fillStyle = object.active ? "rgba(105, 255, 137, 0.72)" : "rgba(255, 205, 85, 0.62)";
        context.fillRect(x + 5, y + 22, TILE_SIZE - 10, 6);
    } else if (object.type === "hazard") {
        context.strokeStyle = "rgba(255, 75, 68, 0.9)";
        context.lineWidth = 2;
        context.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    } else if (object.type === "door") {
        context.strokeStyle = "rgba(107, 215, 255, 0.8)";
        context.lineWidth = 2;
        context.strokeRect(x + 2, y + 1, TILE_SIZE - 4, TILE_SIZE - 2);
    }
    context.restore();
}

export async function loadLevels() {
    const rawManifest = await loadJson("levels/manifest.json");
    loadedLevelManifest = LevelCore.normalizeManifest(rawManifest);
    const definitions = new Map(await Promise.all(
        loadedLevelManifest.levels.map(async (fileName) => [fileName, await loadJson(`levels/${fileName}`)]),
    ));
    const projectValidation = LevelCore.validateProject(loadedLevelManifest, definitions);
    if (projectValidation.errors.length > 0) throw new Error(projectValidation.errors.join(" "));
    return loadedLevelManifest.levels.map((fileName) => {
        const runtime = LevelCore.buildRuntimeLevel(definitions.get(fileName), fileName, TILE_SIZE);
        const metadata = runtime.metadata;
        metadata.objects.forEach((object) => {
            if (object.type === "door") object.initialOpen = object.open;
        });
        metadata.metalObjects = metadata.objects.filter((object) => object.type === "metal");
        metadata.metalTargets = metadata.metalObjects.map((object) => ({
            position: object.position,
            type: "block",
            object,
        }));
        metadata.goals = metadata.objects.filter((object) => object.type === "goal");
        metadata.blockingObjects = new Map(
            metadata.objects.filter((object) => object.type === "metal" || object.type === "door").map(
                (object) => [object.y * runtime.tiles[0].length + object.x, object],
            ),
        );
        levelMetadata.set(runtime.tiles, metadata);
        return runtime.tiles;
    });
}

async function loadJson(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`${path} konnte nicht geladen werden (${response.status}).`);
    return response.json();
}

export function getLevelMetadata(level) {
    const metadata = levelMetadata.get(level);
    if (!metadata) throw new Error("Metadaten für das Level fehlen.");
    return metadata;
}

export function resetLevelObjects(level) {
    for (const object of getLevelMetadata(level).objects) {
        object.active = false;
        if (object.type === "door") object.open = object.initialOpen;
    }
}

export function updateLevelObjects(game) {
    const metadata = getLevelMetadata(currentLevel);
    for (const object of metadata.objects) {
        if (object.type === "hazard" && objectTouchesHero(object, game.hero)) {
            setGameState(game, "gameOver");
            return;
        }
        if (object.type !== "switch" || object.active || !objectTouchesHero(object, game.hero)) continue;
        object.active = true;
        const door = metadata.objects.find((candidate) => candidate.type === "door" && candidate.id === object.targetDoor);
        if (door) door.open = true;
    }
}

function objectTouchesHero(object, hero) {
    const left = object.x * TILE_SIZE;
    const top = object.y * TILE_SIZE;
    const heroLeft = hero.globalPos[0] - hero.size[0] / 2;
    const heroTop = hero.globalPos[1] - hero.size[1];
    return heroLeft < left + TILE_SIZE && heroLeft + hero.size[0] > left &&
        heroTop < top + TILE_SIZE && hero.globalPos[1] > top;
}

export function isSolidTile(level, column, row) {
    if (column < 0 || column >= level[0].length) return true;
    if (row < 0 || row >= level.length) return false;
    if (level[row][column] === TILE_SOLID) return true;
    return LevelCore.isBlockingObject(
        getLevelMetadata(level).blockingObjects.get(row * level[0].length + column),
    );
}

export function isSpriteGrounded(sprite, level) {
    const probeRow = Math.floor((sprite.globalPos[1] + 1) / TILE_SIZE);
    const firstColumn = Math.floor((sprite.globalPos[0] - sprite.size[0] / 2 + 2) / TILE_SIZE);
    const lastColumn = Math.floor((sprite.globalPos[0] + sprite.size[0] / 2 - 2) / TILE_SIZE);
    for (let column = firstColumn; column <= lastColumn; column++) {
        if (isSolidTile(level, column, probeRow)) return true;
    }
    return false;
}

export function moveSpriteWithTileCollisions(sprite, deltaX, deltaY, level) {
    const result = { left: false, right: false, top: false, bottom: false };
    const halfWidth = sprite.size[0] / 2;
    if (deltaX !== 0) {
        let targetX = sprite.globalPos[0] + deltaX;
        const firstRow = Math.floor((sprite.globalPos[1] - sprite.size[1] + 2) / TILE_SIZE);
        const lastRow = Math.floor((sprite.globalPos[1] - 2) / TILE_SIZE);
        const column = Math.floor((targetX + Math.sign(deltaX) * halfWidth) / TILE_SIZE);
        for (let row = firstRow; row <= lastRow; row++) {
            if (!isSolidTile(level, column, row)) continue;
            if (deltaX > 0) {
                targetX = Math.min(targetX, column * TILE_SIZE - halfWidth);
                result.right = true;
            } else {
                targetX = Math.max(targetX, (column + 1) * TILE_SIZE + halfWidth);
                result.left = true;
            }
        }
        sprite.globalPos[0] = targetX;
    }
    if (deltaY !== 0) {
        let targetY = sprite.globalPos[1] + deltaY;
        const firstColumn = Math.floor((sprite.globalPos[0] - halfWidth + 2) / TILE_SIZE);
        const lastColumn = Math.floor((sprite.globalPos[0] + halfWidth - 2) / TILE_SIZE);
        const edgeY = deltaY > 0 ? targetY : targetY - sprite.size[1];
        const row = Math.floor(edgeY / TILE_SIZE);
        for (let column = firstColumn; column <= lastColumn; column++) {
            if (!isSolidTile(level, column, row)) continue;
            if (deltaY > 0) {
                targetY = Math.min(targetY, row * TILE_SIZE);
                result.bottom = true;
            } else {
                targetY = Math.max(targetY, (row + 1) * TILE_SIZE + sprite.size[1]);
                result.top = true;
            }
        }
        sprite.globalPos[1] = targetY;
    }
    return result;
}
