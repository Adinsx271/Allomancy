import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LevelCore } from "../levelCore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function level(overrides = {}) {
    return {
        name: "Testlevel",
        width: 12,
        height: 8,
        spawn: [1.5, 6],
        areas: [{ type: "solid", x: 0, y: 7, width: 12, height: 1, tile: 210 }],
        objects: [],
        ...overrides,
    };
}

test("das echte Levelprojekt besitzt ein gültiges und erreichbares Startlevel", () => {
    const levelsDirectory = path.join(__dirname, "..", "levels");
    const manifest = JSON.parse(fs.readFileSync(path.join(levelsDirectory, "manifest.json"), "utf8"));
    const definitions = new Map(manifest.levels.map((fileName) => [
        fileName,
        JSON.parse(fs.readFileSync(path.join(levelsDirectory, fileName), "utf8")),
    ]));

    const normalized = LevelCore.normalizeManifest(manifest);
    const validation = LevelCore.validateProject(normalized, definitions);

    assert.equal(normalized.startLevel, "level-01.json");
    assert.deepEqual(validation.errors, []);
    assert.equal(validation.warnings.some((warning) => warning.includes("nicht erreichbar")), false);
});

test("das Manifest verlangt ein eindeutiges enthaltenes Startlevel", () => {
    assert.throws(
        () => LevelCore.normalizeManifest({ levels: ["level-01.json"] }),
        /startLevel/,
    );
    assert.throws(
        () => LevelCore.normalizeManifest({ startLevel: "level-02.json", levels: ["level-01.json"] }),
        /fehlt in levels/,
    );
    assert.throws(
        () => LevelCore.normalizeManifest({ startLevel: "level-01.json", levels: ["level-01.json", "level-01.json"] }),
        /doppelte/,
    );
});

test("Levelgrenzen, Spawnpunkt und Tileset-Indizes werden validiert", () => {
    assert.throws(
        () => LevelCore.normalizeLevelDefinition(level({ spawn: [12, 6] }), "spawn.json"),
        /Spawnpunkt liegt außerhalb/,
    );
    assert.throws(
        () => LevelCore.normalizeLevelDefinition(level({
            objects: [{ id: "metal-1", type: "metal", x: 12, y: 2 }],
        }), "object.json"),
        /außerhalb/,
    );
    assert.throws(
        () => LevelCore.normalizeLevelDefinition(level({
            areas: [{ type: "solid", x: 0, y: 7, width: 12, height: 1, tile: 640 }],
        }), "tile.json"),
        /Tileset-Index/,
    );
    assert.throws(
        () => LevelCore.normalizeLevelDefinition(level({
            objects: [{ id: "door-1", type: "door", x: 2, y: 7 }],
        }), "overlap.json"),
        /überlappt feste Geometrie/,
    );
});

test("Geometrie und Levelobjekte bleiben im Laufzeitmodell getrennt", () => {
    const definition = level({
        objects: [
            { id: "metal-1", type: "metal", x: 3, y: 6 },
            { id: "goal-1", type: "goal", x: 10, y: 6 },
            { id: "door-1", type: "door", x: 7, y: 6 },
        ],
    });

    const runtime = LevelCore.buildRuntimeLevel(definition, "test.json", 32);

    assert.equal(runtime.tiles[7][3], LevelCore.TILE_SOLID);
    assert.equal(runtime.tiles[6][3], LevelCore.TILE_EMPTY);
    assert.equal(runtime.tiles[6][7], LevelCore.TILE_EMPTY);
    assert.equal(runtime.metadata.objects.length, 3);
    assert.deepEqual(runtime.metadata.objects[0].position, [112, 208]);
    assert.deepEqual(runtime.metadata.spawnPosition, [48, 192]);
});

test("Metallblöcke und geschlossene Türen blockieren, andere Objekte nicht", () => {
    assert.equal(LevelCore.isBlockingObject({ type: "metal" }), true);
    assert.equal(LevelCore.isBlockingObject({ type: "door", open: false }), true);
    assert.equal(LevelCore.isBlockingObject({ type: "door", open: true }), false);
    assert.equal(LevelCore.isBlockingObject({ type: "goal" }), false);
    assert.equal(LevelCore.isBlockingObject({ type: "switch" }), false);
});

test("Ausgänge wechseln nur explizit und ein leerer Ausgang beendet das Spiel", () => {
    const manifest = { startLevel: "a.json", levels: ["a.json", "b.json"] };

    assert.deepEqual(
        LevelCore.resolveGoalTransition({ type: "goal", id: "goal-1" }, manifest),
        { kind: "complete", targetLevel: null, levelIndex: null },
    );
    assert.deepEqual(
        LevelCore.resolveGoalTransition({ type: "goal", targetLevel: "b.json" }, manifest),
        { kind: "level", targetLevel: "b.json", levelIndex: 1 },
    );
    assert.throws(
        () => LevelCore.resolveGoalTransition({ type: "goal", targetLevel: "missing.json" }, manifest),
        /Unbekanntes Folgelevel/,
    );
});

test("Projektprüfung erkennt fehlende Ziele, falsche Türen, Zyklen und unerreichbare Level", () => {
    const manifest = { startLevel: "a.json", levels: ["a.json", "b.json", "orphan.json"] };
    const definitions = new Map([
        ["a.json", level({ objects: [
            { id: "goal-a", type: "goal", x: 10, y: 6, targetLevel: "b.json" },
            { id: "metal-1", type: "metal", x: 4, y: 6 },
            { id: "switch-1", type: "switch", x: 5, y: 6, targetDoor: "metal-1" },
        ] })],
        ["b.json", level({ objects: [
            { id: "goal-b", type: "goal", x: 10, y: 6, targetLevel: "a.json" },
            { id: "goal-missing", type: "goal", x: 9, y: 6, targetLevel: "missing.json" },
        ] })],
        ["orphan.json", level()],
    ]);

    const validation = LevelCore.validateProject(manifest, definitions);

    assert.equal(validation.errors.some((error) => error.includes("unbekannte Tür")), true);
    assert.equal(validation.errors.some((error) => error.includes("unbekanntes Level")), true);
    assert.equal(validation.cycles.length, 1);
    assert.equal(validation.warnings.some((warning) => warning.includes("orphan.json")), true);
});
