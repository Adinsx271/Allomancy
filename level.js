const TILE_EMPTY = 0;
const TILE_SOLID = 1;
const TILE_METAL = 2;
const TILE_GOAL = 3;

function drawTile(context, tiles, x, y, tileIndex) {
    const sourceX = TILE_SIZE * (tileIndex % 64);
    const sourceY = TILE_SIZE * Math.floor(tileIndex / 64);
    context.drawImage(tiles, sourceX, sourceY, TILE_SIZE, TILE_SIZE, x, y, TILE_SIZE, TILE_SIZE);
}

function drawLevelTiles(context, tiles, level, cameraX, cameraY) {
    const firstColumn = Math.max(0, Math.floor(cameraX / TILE_SIZE));
    const lastColumn = Math.min(level[0].length, Math.ceil((cameraX + SCREEN_WIDTH) / TILE_SIZE) + 1);
    const firstRow = Math.max(0, Math.floor(cameraY / TILE_SIZE));
    const lastRow = Math.min(level.length, Math.ceil((cameraY + SCREEN_HEIGHT) / TILE_SIZE) + 1);

    for (let row = firstRow; row < lastRow; row++) {
        for (let column = firstColumn; column < lastColumn; column++) {
            const tile = level[row][column];
            if (tile === TILE_EMPTY) continue;
            let tileIndex = 18 + 64 * 3;
            if (tile === TILE_METAL) tileIndex = 45 + 64 * 5;
            if (tile === TILE_GOAL) tileIndex = 44 + 64 * 6;
            drawTile(context, tiles, column * TILE_SIZE - cameraX, row * TILE_SIZE - cameraY, tileIndex);
        }
    }
}

function createTestLevel() {
    const width = 70;
    const height = 24;
    const level = Array.from({ length: height }, () => Array(width).fill(TILE_EMPTY));
    const fill = (row, start, end, tile = TILE_SOLID) => {
        for (let column = start; column <= end; column++) level[row][column] = tile;
    };

    fill(17, 0, 12);
    fill(17, 18, 29);
    fill(17, 36, 69);
    for (let row = 18; row <= 22; row++) {
        fill(row, 0, 12);
        fill(row, 18, 29);
        fill(row, 36, 69);
    }
    fill(23, 0, 69);
    fill(14, 5, 8);
    fill(13, 21, 24);
    fill(14, 39, 43);
    fill(11, 47, 51);
    fill(14, 57, 60);

    level[11][15] = TILE_METAL;
    level[15][18] = TILE_METAL;
    level[10][32] = TILE_METAL;
    level[15][36] = TILE_METAL;
    level[8][46] = TILE_METAL;
    level[13][55] = TILE_METAL;
    level[16][66] = TILE_GOAL;
    return level;
}

function createEmptyLevel() {
    const width = 48;
    const height = 24;
    const level = Array.from({ length: height }, () => Array(width).fill(TILE_EMPTY));
    for (let row = 17; row < height; row++) {
        for (let column = 0; column < width; column++) level[row][column] = TILE_SOLID;
    }

    level[12][25] = TILE_METAL;
    level[16][45] = TILE_GOAL;
    return level;
}

function loadLevels() {
    return [createTestLevel(), createEmptyLevel()];
}

let cachedMetadataLevel = null;
let cachedLevelMetadata = null;
function getLevelMetadata(level) {
    if (level === cachedMetadataLevel) return cachedLevelMetadata;
    const metalPositions = [];
    let goalPosition = null;
    for (let row = 0; row < level.length; row++) {
        for (let column = 0; column < level[row].length; column++) {
            if (level[row][column] === TILE_METAL) {
                metalPositions.push([column * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2]);
            } else if (level[row][column] === TILE_GOAL) {
                goalPosition = [column * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2];
            }
        }
    }
    cachedMetadataLevel = level;
    cachedLevelMetadata = { metalPositions, goalPosition };
    return cachedLevelMetadata;
}

function isSolidTile(level, column, row) {
    if (column < 0 || column >= level[0].length) return true;
    return row >= 0 && row < level.length && level[row][column] !== TILE_EMPTY;
}

function isSpriteGrounded(sprite, level) {
    const probeRow = Math.floor((sprite.globalPos[1] + 1) / TILE_SIZE);
    const firstColumn = Math.floor((sprite.globalPos[0] - sprite.size[0] / 2 + 2) / TILE_SIZE);
    const lastColumn = Math.floor((sprite.globalPos[0] + sprite.size[0] / 2 - 2) / TILE_SIZE);
    for (let column = firstColumn; column <= lastColumn; column++) {
        if (isSolidTile(level, column, probeRow)) return true;
    }
    return false;
}

function moveSpriteWithTileCollisions(sprite, deltaX, deltaY, level) {
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
