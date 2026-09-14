import { currentLevel } from "./gameRuntime.js";
import { getLevelMetadata } from "./level.js";

export const METAL_FORCE = Object.freeze({
    nearCoinAcceleration: 1500,
    coinRangeAccelerationLoss: 630,
    maxCoinSpeed: 850,
});

export function updateMetalInteraction(game, deltaTime) {
    const metalTargets = getMetalTargets(game);
    const mode = getMetalMode(game.hero);
    const selectedTarget = game.selectedMetalIndex === null ? null : metalTargets[game.selectedMetalIndex];
    if (game.input.pointerDown && selectedTarget?.type === "coin") {
        if (isCoinAnchoredForForce(selectedTarget.coin, game.hero, mode)) {
            selectedTarget.coin.pinnedThisStep = true;
            game.metalActive = game.hero.applyMetalForce(
                selectedTarget.position,
                mode,
                deltaTime,
                game.metalRange,
            );
        } else {
            game.metalActive = applyAllomancyToCoin(
                selectedTarget.coin,
                game.hero,
                mode,
                deltaTime,
                game.metalRange,
            );
        }
        return;
    }
    game.metalActive = game.input.pointerDown && game.hero.applyMetalForce(
        selectedTarget?.position,
        mode,
        deltaTime,
        game.metalRange,
    );
}

export function getMetalTargets(game) {
    const fixedTargets = getLevelMetadata(currentLevel).metalTargets;
    const coinTargets = game.projectiles.map((coin) => ({
        position: [coin.x, coin.y],
        type: "coin",
        coin,
    }));
    return [...fixedTargets, ...coinTargets];
}

export function isCoinAnchoredForForce(coin, hero, mode) {
    if (!mode) return false;
    const heroCenterY = hero.globalPos[1] - hero.size[1] / 2;
    const deltaX = hero.globalPos[0] - coin.x;
    const deltaY = heroCenterY - coin.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance < 1) return false;
    const coinForceY = deltaY / distance * (mode === "pull" ? 1 : -1);
    return (coin.contactFloor && coinForceY > 0.05) ||
        (coin.contactCeiling && coinForceY < -0.05);
}

export function applyAllomancyToCoin(coin, hero, mode, deltaTime, range) {
    if (!mode) return false;
    const heroCenterY = hero.globalPos[1] - hero.size[1] / 2;
    let deltaX = hero.globalPos[0] - coin.x;
    let deltaY = heroCenterY - coin.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance < 1 || distance > range) return false;
    deltaX /= distance;
    deltaY /= distance;
    const direction = mode === "pull" ? 1 : -1;
    const distanceRatio = distance / range;
    const acceleration = (
        METAL_FORCE.nearCoinAcceleration - METAL_FORCE.coinRangeAccelerationLoss * distanceRatio
    ) / coin.allomanticMass;
    coin.velocityX += deltaX * direction * acceleration * deltaTime;
    coin.velocityY += deltaY * direction * acceleration * deltaTime;
    coin.allomancyActiveThisStep = true;
    const speed = Math.hypot(coin.velocityX, coin.velocityY);
    if (speed > METAL_FORCE.maxCoinSpeed) {
        coin.velocityX = coin.velocityX / speed * METAL_FORCE.maxCoinSpeed;
        coin.velocityY = coin.velocityY / speed * METAL_FORCE.maxCoinSpeed;
    }
    coin.resting = false;
    return true;
}

export function drawMetalLinks(context, game) {
    const mode = getMetalMode(game.hero);
    if (!mode) return;
    const metals = getMetalTargets(game).map((target) => target.position);
    const centerX = game.hero.globalPos[0];
    const centerY = game.hero.globalPos[1] - game.hero.size[1] / 2;
    for (let index = 0; index < metals.length; index++) {
        const metal = metals[index];
        const distance = Math.hypot(metal[0] - centerX, metal[1] - centerY);
        const selected = index === game.selectedMetalIndex;
        const inRange = distance <= game.metalRange;
        context.save();
        context.globalAlpha = inRange ? (selected ? 1 : 0.38) : 0.1;
        context.strokeStyle = mode === "pull" ? "#52b7ff" : "#ff6f61";
        context.fillStyle = context.strokeStyle;
        context.lineWidth = selected ? 4 : 1.5;
        context.beginPath();
        context.moveTo(centerX - game.camera.x, centerY - game.camera.y);
        context.lineTo(metal[0] - game.camera.x, metal[1] - game.camera.y);
        context.stroke();
        context.beginPath();
        context.arc(metal[0] - game.camera.x, metal[1] - game.camera.y, selected ? 9 : 5, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
}

export function getMetalMode(hero) {
    if (hero.inputFlags.pullMetal) return "pull";
    if (hero.inputFlags.pushMetal) return "push";
    return null;
}
