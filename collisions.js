import { TILE_SIZE } from "./gameConfig.js";

export const COIN_COLLISION = Object.freeze({
    wallBounce: 0.12,
    minimumBounceSpeed: 55,
    maxStep: 8,
    contactProbe: 0.5,
});

export function moveCoinWithTileCollisions(coin, deltaTime, level, tileSize = TILE_SIZE, solidCheck) {
    const checkSolid = solidCheck ?? level.isSolidTile;
    const distance = Math.max(Math.abs(coin.velocityX), Math.abs(coin.velocityY)) * deltaTime;
    const stepCount = Math.max(1, Math.ceil(distance / COIN_COLLISION.maxStep));
    const stepTime = deltaTime / stepCount;
    for (let step = 0; step < stepCount; step++) moveCoinCollisionStep(coin, stepTime, level, tileSize, checkSolid);
    updateCoinContacts(coin, level, tileSize, checkSolid);
}

export function moveCoinCollisionStep(coin, deltaTime, level, tileSize = TILE_SIZE, solidCheck = level.isSolidTile) {
    const radius = coin.radius;
    let targetX = coin.x + coin.velocityX * deltaTime;
    const horizontalColumn = Math.floor((targetX + Math.sign(coin.velocityX) * radius) / tileSize);
    const firstRow = Math.floor((coin.y - radius + 1) / tileSize);
    const lastRow = Math.floor((coin.y + radius - 1) / tileSize);
    let hitWall = false;
    for (let row = firstRow; row <= lastRow; row++) {
        if (!solidCheck(level, horizontalColumn, row)) continue;
        targetX = coin.velocityX > 0
            ? horizontalColumn * tileSize - radius
            : (horizontalColumn + 1) * tileSize + radius;
        hitWall = true;
    }
    coin.x = targetX;
    if (hitWall) {
        coin.velocityX = Math.abs(coin.velocityX) < COIN_COLLISION.minimumBounceSpeed
            ? 0
            : coin.velocityX * -COIN_COLLISION.wallBounce;
    }

    let targetY = coin.y + coin.velocityY * deltaTime;
    const verticalRow = Math.floor((targetY + Math.sign(coin.velocityY) * radius) / tileSize);
    const firstColumn = Math.floor((coin.x - radius + 1) / tileSize);
    const lastColumn = Math.floor((coin.x + radius - 1) / tileSize);
    let hitFloor = false;
    let hitCeiling = false;
    for (let column = firstColumn; column <= lastColumn; column++) {
        if (!solidCheck(level, column, verticalRow)) continue;
        if (coin.velocityY > 0) {
            targetY = verticalRow * tileSize - radius;
            hitFloor = true;
        } else {
            targetY = (verticalRow + 1) * tileSize + radius;
            hitCeiling = true;
        }
    }
    coin.y = targetY;
    if (hitFloor) {
        coin.velocityX = 0;
        coin.velocityY = 0;
    }
    if (hitCeiling) coin.velocityY = 0;
    coin.resting = hitFloor && coin.velocityX === 0 && coin.velocityY === 0;
}

export function updateCoinContacts(coin, level, tileSize = TILE_SIZE, solidCheck = level.isSolidTile) {
    const radius = coin.radius;
    const firstColumn = Math.floor((coin.x - radius + 1) / tileSize);
    const lastColumn = Math.floor((coin.x + radius - 1) / tileSize);
    const floorRow = Math.floor((coin.y + radius + COIN_COLLISION.contactProbe) / tileSize);
    const ceilingRow = Math.floor((coin.y - radius - COIN_COLLISION.contactProbe) / tileSize);
    coin.contactFloor = false;
    coin.contactCeiling = false;
    for (let column = firstColumn; column <= lastColumn; column++) {
        coin.contactFloor ||= solidCheck(level, column, floorRow);
        coin.contactCeiling ||= solidCheck(level, column, ceilingRow);
    }
    coin.resting = coin.contactFloor && coin.velocityX === 0 && coin.velocityY === 0;
}
