import test from "node:test";
import assert from "node:assert/strict";
import { parseDefinition, serializeLevel, TILE } from "../level-editor/editor-model.js";

test("Editor und Spiel verwenden dasselbe normalisierte Levelformat", () => {
    const definition = {
        name: "Modelltest",
        width: 8,
        height: 8,
        spawn: [1.5, 5],
        areas: [{ type: "solid", x: 0, y: 6, width: 8, height: 2, tile: 210 }],
        objects: [
            { id: "metal-1", type: "metal", x: 3, y: 5, tile: 365 },
            { id: "goal-1", type: "goal", x: 7, y: 5, tile: 428, targetLevel: "level-02.json" },
        ],
    };

    const editorLevel = parseDefinition(definition, "level-01.json");
    assert.equal(editorLevel.tiles[5][3], TILE.metal);
    assert.equal(editorLevel.goalTargets["7,5"], "level-02.json");
    assert.deepEqual(serializeLevel(editorLevel), definition);
});
