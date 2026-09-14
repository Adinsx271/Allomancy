import test from "node:test";
import assert from "node:assert/strict";
import {
    degreesToRadians,
    findClosestAngleIndex,
    findClosestTargetInCone,
    getAngleFromPoints,
    getSmallestAngleDifference,
} from "../MathLib.js";

test("berechnet Winkel in allen Hauptrichtungen", () => {
    assert.equal(getAngleFromPoints(0, 0, 1, 0), 0);
    assert.equal(getAngleFromPoints(0, 0, 0, 1), 90);
    assert.equal(getAngleFromPoints(0, 0, -1, 0), 180);
    assert.equal(getAngleFromPoints(0, 0, 0, -1), 270);
});

test("liefert für denselben Punkt keinen Winkel", () => {
    assert.equal(getAngleFromPoints(2, 2, 2, 2), null);
});

test("berechnet den kürzesten Abstand über die Null-Grad-Grenze", () => {
    assert.equal(getSmallestAngleDifference(359, 1), 2);
    assert.equal(getSmallestAngleDifference(10, 350), 20);
});

test("findet nur Metallwinkel innerhalb der Toleranz", () => {
    assert.equal(findClosestAngleIndex(1, [180, 359]), 1);
    assert.equal(findClosestAngleIndex(45, [10, 90], 10), null);
});

test("wählt nur Ziele innerhalb des 30-Grad-Zielkegels", () => {
    const degrees = (angle) => [
        Math.cos(degreesToRadians(angle)) * 100,
        Math.sin(degreesToRadians(angle)) * 100,
    ];

    assert.equal(findClosestTargetInCone([0, 0], [100, 0], [degrees(29.9)], 30), 0);
    assert.equal(findClosestTargetInCone([0, 0], [100, 0], [degrees(30.1)], 30), null);
    assert.equal(findClosestTargetInCone([0, 0], [100, 0], [degrees(359)], 30), 0);
});

test("bevorzugt innerhalb des Zielkegels das Ziel nahe am Cursor", () => {
    assert.equal(findClosestTargetInCone([0, 0], [100, 0], [[40, 0], [92, 4]], 30), 1);
});

test("konvertiert Grad in Radiant", () => {
    assert.equal(degreesToRadians(180), Math.PI);
});
