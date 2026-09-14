    const TILE_EMPTY = 0;
    const TILE_SOLID = 1;
    const TILESET_TILE_COUNT = 640;
    const OBJECT_TYPES = Object.freeze(["metal", "goal", "door", "switch", "hazard"]);
    const DEFAULT_OBJECT_TILES = Object.freeze({ metal: 365, goal: 428, door: 29, switch: 32, hazard: 394 });
    const DEFAULT_SOLID_TILE = 210;

    function normalizeManifest(manifest) {
        if (!manifest || !Array.isArray(manifest.levels) || manifest.levels.length === 0) {
            throw new Error("Das Level-Manifest benötigt mindestens ein Level.");
        }
        const levels = manifest.levels.map((fileName) => {
            if (typeof fileName !== "string" || !fileName.trim()) throw new Error("Jeder Manifest-Eintrag muss ein Dateiname sein.");
            return fileName.trim();
        });
        if (new Set(levels).size !== levels.length) throw new Error("Das Level-Manifest enthält doppelte Dateinamen.");
        const startLevel = typeof manifest.startLevel === "string" ? manifest.startLevel.trim() : "";
        if (!startLevel) throw new Error("Das Level-Manifest benötigt startLevel.");
        if (!levels.includes(startLevel)) throw new Error(`Das Startlevel fehlt in levels: ${startLevel}`);
        return { startLevel, levels };
    }

    function normalizeLevelDefinition(definition, fileName = "level.json") {
        if (!definition || !Number.isInteger(definition.width) || !Number.isInteger(definition.height) ||
            definition.width <= 0 || definition.height <= 0) {
            throw new Error(`${fileName}: Breite und Höhe müssen positive ganze Zahlen sein.`);
        }
        if (!Array.isArray(definition.spawn) || definition.spawn.length !== 2 ||
            !definition.spawn.every(Number.isFinite)) {
            throw new Error(`${fileName}: Der Spawnpunkt fehlt oder ist ungültig.`);
        }
        if (definition.spawn[0] < 0 || definition.spawn[0] >= definition.width ||
            definition.spawn[1] < 0 || definition.spawn[1] > definition.height) {
            throw new Error(fileName + ": Der Spawnpunkt liegt außerhalb des Levels.");
        }
        if (definition.areas !== undefined && !Array.isArray(definition.areas)) {
            throw new Error(fileName + ": areas muss eine Liste sein.");
        }
        if (definition.objects !== undefined && !Array.isArray(definition.objects)) {
            throw new Error(fileName + ": objects muss eine Liste sein.");
        }
        const areas = (definition.areas ?? []).map((area, index) => normalizeArea(area, definition, fileName, index));
        const usedIds = new Set();
        const usedPositions = new Set();
        const objects = (definition.objects ?? []).map((object, index) => {
            const normalized = normalizeObject(object, definition, fileName, index);
            if (usedIds.has(normalized.id)) throw new Error(`${fileName}: Doppelte Objekt-ID ${normalized.id}.`);
            const positionKey = `${normalized.x},${normalized.y}`;
            if (usedPositions.has(positionKey)) throw new Error(`${fileName}: Mehrere Objekte bei ${positionKey}.`);
            if (areas.some((area) => normalized.x >= area.x && normalized.x < area.x + area.width &&
                normalized.y >= area.y && normalized.y < area.y + area.height)) {
                throw new Error(`${fileName}: Objekt ${normalized.id} überlappt feste Geometrie.`);
            }
            usedIds.add(normalized.id);
            usedPositions.add(positionKey);
            return normalized;
        });
        return {
            name: typeof definition.name === "string" && definition.name.trim() ? definition.name.trim() : "Unbenanntes Level",
            width: definition.width,
            height: definition.height,
            spawn: [...definition.spawn],
            areas,
            objects,
        };
    }

    function normalizeArea(area, definition, fileName, index) {
        const values = [area?.x, area?.y, area?.width, area?.height];
        if (!values.every(Number.isInteger) || area.width <= 0 || area.height <= 0 || area.x < 0 || area.y < 0 ||
            area.x + area.width > definition.width || area.y + area.height > definition.height) {
            throw new Error(`${fileName}: Ungültige Fläche ${index}.`);
        }
        if (area.type !== "solid") throw new Error(`${fileName}: Flächen unterstützen nur den Typ solid.`);
        return { type: "solid", x: area.x, y: area.y, width: area.width, height: area.height, tile: normalizeTile(area.tile, DEFAULT_SOLID_TILE, fileName) };
    }

    function normalizeObject(object, definition, fileName, index) {
        if (!object || !OBJECT_TYPES.includes(object.type)) throw new Error(`${fileName}: Unbekannter Objekttyp ${object?.type}.`);
        if (!Number.isInteger(object.x) || !Number.isInteger(object.y) || object.x < 0 || object.y < 0 ||
            object.x >= definition.width || object.y >= definition.height) {
            throw new Error(`${fileName}: Objekt ${index} liegt außerhalb des Levels.`);
        }
        const normalized = {
            id: typeof object.id === "string" && object.id.trim() ? object.id.trim() : `${object.type}-${index + 1}`,
            type: object.type,
            x: object.x,
            y: object.y,
            tile: normalizeTile(object.tile, DEFAULT_OBJECT_TILES[object.type], fileName),
        };
        if (object.type === "goal" && object.targetLevel !== undefined) {
            if (typeof object.targetLevel !== "string" || !object.targetLevel.trim()) throw new Error(`${fileName}: targetLevel muss ein Dateiname sein.`);
            normalized.targetLevel = object.targetLevel.trim();
        }
        if (object.type === "switch" && object.targetDoor !== undefined) {
            if (typeof object.targetDoor !== "string" || !object.targetDoor.trim()) throw new Error(`${fileName}: targetDoor muss eine Objekt-ID sein.`);
            normalized.targetDoor = object.targetDoor.trim();
        }
        if (object.type === "door") normalized.open = Boolean(object.open);
        if (object.type === "hazard") normalized.damage = Number.isFinite(object.damage) ? Math.max(0, object.damage) : 1;
        return normalized;
    }

    function normalizeTile(tile, fallback, fileName) {
        const tileIndex = tile ?? fallback;
        if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= TILESET_TILE_COUNT) {
            throw new Error(`${fileName}: Ungültiger Tileset-Index ${tileIndex}.`);
        }
        return tileIndex;
    }

    function buildRuntimeLevel(definition, fileName, tileSize) {
        const normalized = normalizeLevelDefinition(definition, fileName);
        const tiles = Array.from({ length: normalized.height }, () => Array(normalized.width).fill(TILE_EMPTY));
        const visualTiles = Array.from({ length: normalized.height }, () => Array(normalized.width).fill(null));
        for (const area of normalized.areas) {
            for (let row = area.y; row < area.y + area.height; row++) {
                for (let column = area.x; column < area.x + area.width; column++) {
                    tiles[row][column] = TILE_SOLID;
                    visualTiles[row][column] = area.tile;
                }
            }
        }
        const objects = normalized.objects.map((object) => ({
            ...object,
            position: [(object.x + 0.5) * tileSize, (object.y + 0.5) * tileSize],
            active: false,
            open: object.type === "door" ? object.open : undefined,
        }));
        return {
            tiles,
            metadata: {
                fileName,
                name: normalized.name,
                spawnPosition: [normalized.spawn[0] * tileSize, normalized.spawn[1] * tileSize],
                visualTiles,
                objects,
            },
        };
    }

    function validateProject(manifestInput, definitionsByFile) {
        const errors = [];
        const warnings = [];
        let manifest;
        try {
            manifest = normalizeManifest(manifestInput);
        } catch (error) {
            return { errors: [error.message], warnings, edges: [], cycles: [] };
        }
        const definitions = new Map();
        for (const fileName of manifest.levels) {
            const raw = definitionsByFile instanceof Map ? definitionsByFile.get(fileName) : definitionsByFile?.[fileName];
            if (!raw) {
                errors.push(`Leveldatei fehlt: ${fileName}`);
                continue;
            }
            try {
                definitions.set(fileName, normalizeLevelDefinition(raw, fileName));
            } catch (error) {
                errors.push(error.message);
            }
        }
        const edges = [];
        for (const [fileName, definition] of definitions) {
            const doorIds = new Set(
                definition.objects.filter((object) => object.type === "door").map((object) => object.id),
            );
            for (const object of definition.objects) {
                if (object.type === "goal") {
                    if (!object.targetLevel) warnings.push(`${fileName}: Ausgang ${object.id} beendet das Spiel.`);
                    else if (!manifest.levels.includes(object.targetLevel)) errors.push(`${fileName}: ${object.id} verweist auf unbekanntes Level ${object.targetLevel}.`);
                    else edges.push({ from: fileName, to: object.targetLevel, objectId: object.id });
                }
                if (object.type === "switch" && object.targetDoor && !doorIds.has(object.targetDoor)) {
                    errors.push(`${fileName}: Schalter ${object.id} verweist auf unbekannte Tür ${object.targetDoor}.`);
                }
            }
        }
        const cycles = findCycles(manifest.levels, edges);
        for (const cycle of cycles) warnings.push(`Zyklus: ${cycle.join(" → ")}`);
        const reachable = findReachableLevels(manifest.startLevel, edges);
        for (const fileName of manifest.levels) {
            if (!reachable.has(fileName)) warnings.push(`Vom Startlevel nicht erreichbar: ${fileName}`);
        }
        return { errors, warnings, edges, cycles };
    }

    function findReachableLevels(startLevel, edges) {
        const reachable = new Set();
        const pending = [startLevel];
        while (pending.length > 0) {
            const fileName = pending.pop();
            if (reachable.has(fileName)) continue;
            reachable.add(fileName);
            for (const edge of edges) {
                if (edge.from === fileName && !reachable.has(edge.to)) pending.push(edge.to);
            }
        }
        return reachable;
    }

    function findCycles(levelFiles, edges) {
        const adjacency = new Map(levelFiles.map((file) => [file, []]));
        for (const edge of edges) adjacency.get(edge.from)?.push(edge.to);
        const cycles = [];
        const seenCycles = new Set();
        function visit(node, path) {
            const cycleStart = path.indexOf(node);
            if (cycleStart >= 0) {
                const cycle = [...path.slice(cycleStart), node];
                const key = [...new Set(cycle.slice(0, -1))].sort().join("|");
                if (!seenCycles.has(key)) {
                    seenCycles.add(key);
                    cycles.push(cycle);
                }
                return;
            }
            if (path.length >= levelFiles.length) return;
            for (const next of adjacency.get(node) ?? []) visit(next, [...path, node]);
        }
        for (const file of levelFiles) visit(file, []);
        return cycles;
    }

    function getTargetLevel(goal) {
        return goal?.type === "goal" && typeof goal.targetLevel === "string" ? goal.targetLevel : null;
    }

    function isBlockingObject(object) {
        return object?.type === "metal" || (object?.type === "door" && !object.open);
    }

    function resolveGoalTransition(goal, manifestInput) {
        const manifest = normalizeManifest(manifestInput);
        const targetLevel = getTargetLevel(goal);
        if (!targetLevel) return { kind: "complete", targetLevel: null, levelIndex: null };
        const levelIndex = manifest.levels.indexOf(targetLevel);
        if (levelIndex < 0) throw new Error(`Unbekanntes Folgelevel: ${targetLevel}`);
        return { kind: "level", targetLevel, levelIndex };
    }

    const LevelCore = Object.freeze({
        TILE_EMPTY,
        TILE_SOLID,
        TILESET_TILE_COUNT,
        OBJECT_TYPES,
        DEFAULT_OBJECT_TILES,
        DEFAULT_SOLID_TILE,
        normalizeManifest,
        normalizeLevelDefinition,
        buildRuntimeLevel,
        validateProject,
        findCycles,
        findReachableLevels,
        getTargetLevel,
        isBlockingObject,
        resolveGoalTransition,
    });
    export {
        LevelCore,
        TILE_EMPTY,
        TILE_SOLID,
        TILESET_TILE_COUNT,
        OBJECT_TYPES,
        DEFAULT_OBJECT_TILES,
        DEFAULT_SOLID_TILE,
        normalizeManifest,
        normalizeLevelDefinition,
        buildRuntimeLevel,
        validateProject,
        findCycles,
        findReachableLevels,
        getTargetLevel,
        isBlockingObject,
        resolveGoalTransition,
    };
