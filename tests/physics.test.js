import test from "node:test";
import assert from "node:assert/strict";
import { moveCoinWithTileCollisions } from "../collisions.js";
import { METAL_FORCE, isCoinAnchoredForForce, applyAllomancyToCoin } from "../metal.js";
import { COIN_PHYSICS, coinTouchesHero } from "../coins.js";

function hero(x = 100, centerY = 100) {
    return { globalPos: [x, centerY + 32], size: [28, 64] };
}

function coin(overrides = {}) {
    return {
        x: 0,
        y: 0,
        radius: 6,
        velocityX: 0,
        velocityY: 0,
        allomanticMass: COIN_PHYSICS.allomanticMass,
        resting: false,
        contactFloor: false,
        contactCeiling: false,
        allomancyActiveThisStep: false,
        ...overrides,
    };
}

test("Ziehen beschleunigt eine Münze zum Spieler und respektiert Reichweite sowie Höchsttempo", () => {
    const projectile = coin({ x: 0, y: 100, velocityX: 840 });

    assert.equal(applyAllomancyToCoin(projectile, hero(), "pull", 1, 520), true);
    assert.equal(projectile.velocityX > 0, true);
    assert.equal(Math.hypot(projectile.velocityX, projectile.velocityY) <= METAL_FORCE.maxCoinSpeed, true);
    assert.equal(projectile.allomancyActiveThisStep, true);

    const distantCoin = coin({ x: -1000, y: 100 });
    assert.equal(applyAllomancyToCoin(distantCoin, hero(), "pull", 1 / 60, 520), false);
    assert.deepEqual([distantCoin.velocityX, distantCoin.velocityY], [0, 0]);
});

test("eine Münze wird nur an der zur Kraft passenden Fläche zum Anker", () => {
    const player = hero(100, 100);

    assert.equal(isCoinAnchoredForForce(coin({ x: 100, y: 130, contactCeiling: true }), player, "pull"), true);
    assert.equal(isCoinAnchoredForForce(coin({ x: 100, y: 70, contactFloor: true }), player, "pull"), true);
    assert.equal(isCoinAnchoredForForce(coin({ x: 100, y: 130, contactFloor: true }), player, "pull"), false);
    assert.equal(isCoinAnchoredForForce(coin({ x: 100, y: 130, contactFloor: true }), player, "push"), true);
});

test("Münzen bleiben bei Bodenkontakt direkt liegen", () => {
    const tiles = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [1, 1, 1, 1],
    ];
    const solidCheck = (level, column, row) => column < 0 || column >= level[0].length ||
        (row >= 0 && row < level.length && level[row][column] === 1);
    const projectile = coin({ x: 48, y: 42, velocityX: 100, velocityY: 260 });

    moveCoinWithTileCollisions(projectile, 0.1, tiles, 32, solidCheck);

    assert.equal(projectile.y, 58);
    assert.equal(projectile.velocityX, 0);
    assert.equal(projectile.velocityY, 0);
    assert.equal(projectile.contactFloor, true);
    assert.equal(projectile.resting, true);
});

test("eine zurückgezogene Münze kann vom Spieler eingesammelt werden", () => {
    const player = hero(100, 100);

    assert.equal(coinTouchesHero(coin({ x: 100, y: 100 }), player), true);
    assert.equal(coinTouchesHero(coin({ x: 200, y: 100 }), player), false);
});
