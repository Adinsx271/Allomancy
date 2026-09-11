function updateGame(game, deltaTime) {
    game.elapsedTime += deltaTime;
    game.hero.beginStep(deltaTime, currentLevel);
    game.input.update(game.hero, deltaTime);

    const metadata = getLevelMetadata(currentLevel);
    const metalTargets = getMetalTargets(game);
    const mode = getMetalMode(game.hero);
    const selectedTarget = game.selectedMetalIndex === null ? null : metalTargets[game.selectedMetalIndex];
    if (game.input.pointerDown && selectedTarget?.type === "coin" && !selectedTarget.coin.resting) {
        game.metalActive = applyAllomancyToCoin(selectedTarget.coin, game.hero, mode, deltaTime, game.metalRange);
    } else {
        game.metalActive = game.input.pointerDown && game.hero.applyMetalForce(
            selectedTarget?.position,
            mode,
            deltaTime,
            game.metalRange,
        );
    }
    game.hero.update(deltaTime, currentLevel, game.gravity);
    updateProjectiles(game, deltaTime);

    if (game.hero.globalPos[1] > currentLevel.length * TILE_SIZE + 160) {
        setGameState(game, "gameOver");
        return;
    }
    if (metadata.goalPosition && Math.hypot(
        game.hero.globalPos[0] - metadata.goalPosition[0],
        game.hero.globalPos[1] - game.hero.size[1] / 2 - metadata.goalPosition[1],
    ) < 58) {
        game.points = Math.max(100, 1500 - Math.floor(game.elapsedTime * 10));
        setGameState(game, "complete");
    }

    updateCamera(game, deltaTime);
    game.hero.adjustRenderPos(game.camera.x, game.camera.y);
}

function updateCamera(game, deltaTime) {
    const levelWidth = currentLevel[0].length * TILE_SIZE;
    const levelHeight = currentLevel.length * TILE_SIZE;
    const lookAhead = Math.max(-90, Math.min(90, game.hero.vel[0] * 0.3));
    const desiredX = game.hero.globalPos[0] - SCREEN_WIDTH * 0.43 + lookAhead;
    const desiredY = game.hero.globalPos[1] - SCREEN_HEIGHT * 0.78;
    const targetX = Math.max(0, Math.min(desiredX, levelWidth - SCREEN_WIDTH));
    const targetY = Math.max(0, Math.min(desiredY, levelHeight - SCREEN_HEIGHT));
    const smoothing = 1 - Math.exp(-7 * deltaTime);
    game.camera.x += (targetX - game.camera.x) * smoothing;
    game.camera.y += (targetY - game.camera.y) * smoothing;
}

function renderCurrentState(game) {
    if (game.state === "title") {
        renderTitleScreen(game);
        return;
    }
    renderGame(game);
    if (game.state === "paused") renderMessageOverlay(game.context, "Pause", "Esc: fortsetzen · R: Neustart");
    if (game.state === "gameOver") renderMessageOverlay(game.context, "Gefallen", "R: erneut versuchen");
    if (game.state === "complete") renderMessageOverlay(game.context, "Demo abgeschlossen", `${game.points} Punkte · R: erneut spielen`);
}

function renderGame(game) {
    const { context } = game;
    context.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    drawParallax(context, game.camera.x, game.camera.y);
    drawLevelTiles(context, tiles, currentLevel, game.camera.x, game.camera.y);
    drawGoal(context, game);
    drawMetalLinks(context, game);
    drawProjectiles(context, game);
    game.hero.draw(context, heroSprites);
    drawHud(context, game);
}

function drawParallax(context, cameraX, cameraY) {
    context.drawImage(layers[0], 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    for (let index = 1; index < layers.length; index++) {
        const parallaxX = -((cameraX * (0.015 * Math.pow(2, index))) % SCREEN_WIDTH);
        const parallaxY = -cameraY * (0.015 * index);
        context.drawImage(layers[index], parallaxX, parallaxY, SCREEN_WIDTH, SCREEN_HEIGHT);
        context.drawImage(layers[index], parallaxX + SCREEN_WIDTH, parallaxY, SCREEN_WIDTH, SCREEN_HEIGHT);
    }
}

function drawGoal(context, game) {
    const goal = getLevelMetadata(currentLevel).goalPosition;
    if (!goal) return;
    const x = goal[0] - game.camera.x;
    const y = goal[1] - game.camera.y;
    context.save();
    context.strokeStyle = "#f7e36d";
    context.lineWidth = 3;
    context.shadowColor = "#f7e36d";
    context.shadowBlur = 12;
    context.strokeRect(x - 17, y - 17, 34, 34);
    context.restore();
}

function drawMetalLinks(context, game) {
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

function drawHud(context, game) {
    const mode = getMetalMode(game.hero);
    const modeLabel = mode === "pull" ? "ZIEHEN" : mode === "push" ? "STOSSEN" : "AUS";
    const modeColor = mode === "pull" ? "#52b7ff" : mode === "push" ? "#ff6f61" : "#d6d6d6";
    context.save();
    context.fillStyle = "rgba(12, 15, 24, 0.78)";
    context.fillRect(12, 12, 270, 202);
    context.fillStyle = "white";
    context.font = "bold 18px system-ui, sans-serif";
    context.fillText(`${game.points} PTS`, 24, 38);
    context.fillStyle = modeColor;
    context.fillText(`ALLOMANTIE: ${modeLabel}`, 24, 64);
    context.fillStyle = "#d7dbe7";
    context.font = "13px system-ui, sans-serif";
    context.fillText(`EINGESAMMELTE MÜNZEN: ${game.coinsCollected}`, 24, 84);
    const targetLabel = !game.input.pointerDown ? "MT4/MT5 über Metall halten" : game.metalActive ? "Kraft aktiv" : "Ziel außer Reichweite";
    context.fillText(targetLabel, 24, 106);
    const arts = game.hero.metalArts;
    const ironMode = arts.ironMode === "storing" ? "LEICHT" : arts.ironMode === "tapping" ? "SCHWER" : "NORMAL";
    const steelMode = arts.steelMode === "storing" ? "SPEICHERN" : arts.steelMode === "tapping" ? "ABRUFEN" : "NORMAL";
    drawResourceBar(context, 24, 124, 242, arts.ironReserve, arts.ironMax, "#70b9d8", `EISEN – ${ironMode}`);
    drawResourceBar(context, 24, 153, 242, arts.steelReserve, arts.steelMax, "#b9d9e8", `STAHL – ${steelMode}`);
    drawResourceBar(context, 24, 182, 242, arts.pewterReserve, arts.pewterMax, "#b778e6", `WEISSBLECH${arts.pewterActive ? " – AKTIV" : ""}`);
    context.fillStyle = "rgba(12, 15, 24, 0.72)";
    context.fillRect(SCREEN_WIDTH - 394, 12, 382, 92);
    context.fillStyle = "#f2f2f2";
    context.fillText("A/D Laufen · W Springen · Leertaste Nahkampf · Strg Münze", SCREEN_WIDTH - 384, 32);
    context.fillText("MT4 Ziehen · MT5 Stoßen · Q/E Gewicht umschalten", SCREEN_WIDTH - 384, 52);
    context.fillText("C/Shift Tempo umschalten · F Weißblech umschalten", SCREEN_WIDTH - 384, 72);
    context.fillText("Esc Pause · R Neustart", SCREEN_WIDTH - 384, 92);
    context.restore();
}

function drawResourceBar(context, x, y, width, value, maximum, color, label) {
    context.fillStyle = "#d7dbe7";
    context.font = "11px system-ui, sans-serif";
    context.fillText(label, x, y);
    context.fillStyle = "rgba(255, 255, 255, 0.14)";
    context.fillRect(x, y + 5, width, 8);
    context.fillStyle = color;
    context.fillRect(x, y + 5, width * (value / maximum), 8);
}

function renderTitleScreen(game) {
    const { context } = game;
    context.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    context.drawImage(titleScreen, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    context.fillStyle = "rgba(8, 10, 18, 0.58)";
    context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    context.textAlign = "center";
    context.fillStyle = "#f3e7c3";
    context.font = "bold 68px Georgia, serif";
    context.fillText("ALLOMANCY", SCREEN_WIDTH / 2, 165);
    context.font = "20px system-ui, sans-serif";
    context.fillStyle = "white";
    context.fillText("Nutze Metall, um den leuchtenden Ausgang zu erreichen.", SCREEN_WIDTH / 2, 220);
    context.fillStyle = "#f7e36d";
    context.font = "bold 24px system-ui, sans-serif";
    context.fillText("ENTER zum Starten", SCREEN_WIDTH / 2, 292);
    context.fillStyle = "#d7dbe7";
    context.font = "16px system-ui, sans-serif";
    context.fillText("Leertaste: Nahkampf · Strg: Münze · MT4: Ziehen · MT5: Stoßen", SCREEN_WIDTH / 2, 334);
    context.font = "14px system-ui, sans-serif";
    context.fillText("Q/E: Gewicht-Toggle · C/Shift: Tempo-Toggle · F: Weißblech-Toggle", SCREEN_WIDTH / 2, 365);
    context.textAlign = "start";
}

function renderMessageOverlay(context, title, subtitle) {
    context.fillStyle = "rgba(5, 7, 13, 0.72)";
    context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    context.textAlign = "center";
    context.fillStyle = "white";
    context.font = "bold 46px Georgia, serif";
    context.fillText(title, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 12);
    context.fillStyle = "#f7e36d";
    context.font = "20px system-ui, sans-serif";
    context.fillText(subtitle, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 38);
    context.textAlign = "start";
}

function setGameState(game, state) {
    game.state = state;
    if (["paused", "gameOver", "complete", "title"].includes(state)) game.audio.pause();
    if (state === "playing" && game.audioStarted) game.audio.play().catch(() => {});
}

function getMetalTargets(game) {
    const fixedTargets = getLevelMetadata(currentLevel).metalPositions.map((position) => ({
        position,
        type: "block",
    }));
    const coinTargets = game.projectiles.map((coin) => ({
        position: [coin.x, coin.y],
        type: "coin",
        coin,
    }));
    return [...fixedTargets, ...coinTargets];
}

function fireCoin(game) {
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
        resting: false,
        restingTime: 0,
        age: 0,
    });
}

function updateProjectiles(game, deltaTime) {
    game.projectiles = game.projectiles.filter((coin) => {
        coin.age += deltaTime;
        coin.velocityY += game.gravity * deltaTime;
        moveCoinWithTileCollisions(coin, deltaTime);
        coin.rotation += 18 * deltaTime;
        if (coin.age > 0.25 && coinTouchesHero(coin, game.hero)) {
            game.coinsCollected += 1;
            return false;
        }
        if (coin.resting) coin.restingTime += deltaTime;
        else coin.restingTime = 0;
        return coin.restingTime < 15 && coin.y < currentLevel.length * TILE_SIZE + 200;
    });
}

function applyAllomancyToCoin(coin, hero, mode, deltaTime, range) {
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
    const acceleration = 1500 - 630 * distanceRatio;
    coin.velocityX += deltaX * direction * acceleration * deltaTime;
    coin.velocityY += deltaY * direction * acceleration * deltaTime;
    const speed = Math.hypot(coin.velocityX, coin.velocityY);
    const maxSpeed = 650;
    if (speed > maxSpeed) {
        coin.velocityX = coin.velocityX / speed * maxSpeed;
        coin.velocityY = coin.velocityY / speed * maxSpeed;
    }
    coin.resting = false;
    coin.restingTime = 0;
    return true;
}

function coinTouchesHero(coin, hero) {
    const closestX = Math.max(hero.globalPos[0] - hero.size[0] / 2, Math.min(coin.x, hero.globalPos[0] + hero.size[0] / 2));
    const closestY = Math.max(hero.globalPos[1] - hero.size[1], Math.min(coin.y, hero.globalPos[1]));
    return Math.hypot(coin.x - closestX, coin.y - closestY) <= coin.radius + 3;
}

function moveCoinWithTileCollisions(coin, deltaTime) {
    const radius = coin.radius;
    let targetX = coin.x + coin.velocityX * deltaTime;
    const horizontalColumn = Math.floor((targetX + Math.sign(coin.velocityX) * radius) / TILE_SIZE);
    const firstRow = Math.floor((coin.y - radius + 1) / TILE_SIZE);
    const lastRow = Math.floor((coin.y + radius - 1) / TILE_SIZE);
    let hitWall = false;
    for (let row = firstRow; row <= lastRow; row++) {
        if (!isSolidTile(currentLevel, horizontalColumn, row)) continue;
        targetX = coin.velocityX > 0
            ? horizontalColumn * TILE_SIZE - radius
            : (horizontalColumn + 1) * TILE_SIZE + radius;
        hitWall = true;
    }
    coin.x = targetX;
    if (hitWall) coin.velocityX = Math.abs(coin.velocityX) < 55 ? 0 : coin.velocityX * -0.12;

    let targetY = coin.y + coin.velocityY * deltaTime;
    const verticalRow = Math.floor((targetY + Math.sign(coin.velocityY) * radius) / TILE_SIZE);
    const firstColumn = Math.floor((coin.x - radius + 1) / TILE_SIZE);
    const lastColumn = Math.floor((coin.x + radius - 1) / TILE_SIZE);
    let hitFloor = false;
    let hitCeiling = false;
    for (let column = firstColumn; column <= lastColumn; column++) {
        if (!isSolidTile(currentLevel, column, verticalRow)) continue;
        if (coin.velocityY > 0) {
            targetY = verticalRow * TILE_SIZE - radius;
            hitFloor = true;
        } else {
            targetY = (verticalRow + 1) * TILE_SIZE + radius;
            hitCeiling = true;
        }
    }
    coin.y = targetY;
    if (hitFloor) coin.velocityY = coin.velocityY < 80 ? 0 : coin.velocityY * -0.22;
    if (hitCeiling) coin.velocityY *= -0.22;
    if (hitFloor) {
        coin.velocityX *= Math.pow(0.62, deltaTime * 60);
        if (Math.abs(coin.velocityX) < 20) coin.velocityX = 0;
    }
    coin.resting = hitFloor && coin.velocityX === 0 && coin.velocityY === 0;
}

function drawProjectiles(context, game) {
    for (const coin of game.projectiles) {
        const x = coin.x - game.camera.x;
        const y = coin.y - game.camera.y;
        context.save();
        if (coin.restingTime > 12) context.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(coin.restingTime * 8));
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

function startGame(game) {
    resetGame(game);
}

function resetGame(game) {
    game.input.releaseMetalTarget();
    game.input.resetAbilityToggles();
    game.hero = new Hero(...HERO_SPAWN);
    game.selectedMetalIndex = null;
    game.metalActive = false;
    game.projectiles = [];
    game.coinsCollected = 0;
    game.points = 0;
    game.elapsedTime = 0;
    game.camera.x = 0;
    game.camera.y = Math.max(0, currentLevel.length * TILE_SIZE - SCREEN_HEIGHT);
    game.hero.isGrounded = isSpriteGrounded(game.hero, currentLevel);
    game.hero.adjustRenderPos(game.camera.x, game.camera.y);
    setGameState(game, "playing");
}
