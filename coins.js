import { moveCoinWithTileCollisions } from "./collisions.js";
import { currentLevel } from "./gameRuntime.js";
import { isSolidTile } from "./level.js";

export const COIN_PHYSICS = Object.freeze({
    allomanticMass: 0.5,
});

export function fireCoin(game) {
    if (game.coinInventory <= 0) return false;
    game.coinInventory -= 1;
    const cursor = game.input.getCursorWorldPosition();
    const heroCenterY = game.hero.globalPos[1] - game.hero.size[1] * 0.58;
    let directionX = game.hero.looksRight ? 1 : -1;
    let directionY = 0;
    if (cursor) {
        const deltaX = cursor[0] - game.hero.globalPos[0];
        const deltaY = cursor[1] - heroCenterY;
        const distance = Math.hypot(deltaX, deltaY);
        if (distance > 1) {
            directionX = deltaX / distance;
            directionY = deltaY / distance;
            if (Math.abs(directionX) > 0.05) game.hero.looksRight = directionX > 0;
        }
    }
    const startX = game.hero.globalPos[0] + directionX * 20;
    const startY = game.hero.globalPos[1] - game.hero.size[1] * 0.58;
    game.projectiles.push({
        x: startX,
        y: startY,
        startX,
        startY,
        velocityX: directionX * 540 + game.hero.vel[0] * 0.25,
        velocityY: directionY * 540,
        directionX,
        directionY,
        rotation: 0,
        radius: 6,
        allomanticMass: COIN_PHYSICS.allomanticMass,
        resting: false,
        contactFloor: false,
        contactCeiling: false,
        pinnedThisStep: false,
        allomancyActiveThisStep: false,
        age: 0,
    });
    return true;
}

export function updateProjectiles(game, deltaTime) {
    game.projectiles = game.projectiles.filter((coin) => {
        coin.age += deltaTime;
        if (coin.pinnedThisStep) {
            coin.velocityX = 0;
            coin.velocityY = 0;
            coin.resting = true;
            coin.pinnedThisStep = false;
        } else {
            if (!coin.allomancyActiveThisStep) coin.velocityY += game.gravity * deltaTime;
            moveCoinWithTileCollisions(coin, deltaTime, currentLevel, undefined, isSolidTile);
        }
        coin.allomancyActiveThisStep = false;
        coin.rotation += 18 * deltaTime;
        if (coin.age > 0.25 && coinTouchesHero(coin, game.hero)) {
            game.coinInventory += 1;
            return false;
        }
        return true;
    });
}

export function coinTouchesHero(coin, hero) {
    const closestX = Math.max(hero.globalPos[0] - hero.size[0] / 2, Math.min(coin.x, hero.globalPos[0] + hero.size[0] / 2));
    const closestY = Math.max(hero.globalPos[1] - hero.size[1], Math.min(coin.y, hero.globalPos[1]));
    return Math.hypot(coin.x - closestX, coin.y - closestY) <= coin.radius + 3;
}

export function drawProjectiles(context, game) {
    for (const coin of game.projectiles) {
        const x = coin.x - game.camera.x;
        const y = coin.y - game.camera.y;
        context.save();
        const trailX = x - coin.directionX * 30;
        const trailY = y - coin.directionY * 30;
        const trail = context.createLinearGradient(x, y, trailX, trailY);
        trail.addColorStop(0, "rgba(92, 195, 255, 0.9)");
        trail.addColorStop(1, "rgba(92, 195, 255, 0)");
        context.strokeStyle = trail;
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(trailX, trailY);
        context.stroke();
        context.translate(x, y);
        context.scale(Math.max(0.18, Math.abs(Math.cos(coin.rotation))), 1);
        context.fillStyle = "#d9a928";
        context.strokeStyle = "#fff1a6";
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(0, 0, 6, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.restore();
    }
}
