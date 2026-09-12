class InputController {
    constructor(canvas) {
        this.pressedKeys = new Set();
        this.pointerDown = false;
        this.metalButton = null;
        this.pointerCanvasPosition = null;
        this.abilityModes = {
            iron: "normal",
            steel: "normal",
            pewter: false,
        };
        window.addEventListener("keydown", (event) => this.onKeyDown(event));
        window.addEventListener("keyup", (event) => this.onKeyUp(event));
        window.addEventListener("blur", () => this.reset());
        window.addEventListener("pointerup", (event) => this.onPointerUp(event));
        window.addEventListener("pointercancel", () => this.releaseMetalTarget());
        canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event));
        canvas.addEventListener("pointermove", (event) => this.onPointerMove(event));
        canvas.addEventListener("auxclick", (event) => {
            if ([3, 4].includes(event.button)) event.preventDefault();
        });
    }

    onKeyDown(event) {
        const controlledKeys = [
            "KeyA", "KeyC", "KeyD", "KeyE", "KeyF", "KeyQ", "KeyR", "KeyS", "KeyW",
            "Space", "ControlLeft", "ControlRight", "ShiftLeft", "ShiftRight", "Enter", "Escape",
        ];
        if (controlledKeys.includes(event.code)) event.preventDefault();
        this.pressedKeys.add(event.code);
        if (event.repeat) return;

        if (event.code === "Enter" && game.state === "title") {
            startGame(game);
        } else if (event.code === "Escape" && ["playing", "paused"].includes(game.state)) {
            setGameState(game, game.state === "playing" ? "paused" : "playing");
        } else if (event.code === "KeyR" && game.state !== "title") {
            resetGame(game);
        } else if (event.code === "KeyW" && game.state === "playing" && game.hero.isGrounded) {
            game.hero.queueJump();
        } else if (event.code === "Space" && game.state === "playing") {
            game.hero.startAttack("melee");
        } else if (["ControlLeft", "ControlRight"].includes(event.code) && game.state === "playing") {
            if (game.coinInventory > 0 && game.hero.startAttack("ranged")) fireCoin(game);
        } else if (event.code === "KeyQ" && game.state === "playing") {
            this.abilityModes.iron = this.abilityModes.iron === "tapping" ? "normal" : "tapping";
        } else if (event.code === "KeyE" && game.state === "playing") {
            this.abilityModes.iron = this.abilityModes.iron === "storing" ? "normal" : "storing";
        } else if (event.code === "KeyC" && game.state === "playing") {
            this.abilityModes.steel = this.abilityModes.steel === "storing" ? "normal" : "storing";
        } else if (["ShiftLeft", "ShiftRight"].includes(event.code) && game.state === "playing") {
            this.abilityModes.steel = this.abilityModes.steel === "tapping" ? "normal" : "tapping";
        } else if (event.code === "KeyF" && game.state === "playing") {
            this.abilityModes.pewter = !this.abilityModes.pewter;
        }
    }

    onKeyUp(event) {
        this.pressedKeys.delete(event.code);
        if (event.code === "KeyW" && game.hero?.isGrounded) game.hero.cutJump();
    }

    update(hero, deltaTime) {
        hero.updateMetalArts({
            storeWeight: this.abilityModes.iron === "storing",
            tapWeight: this.abilityModes.iron === "tapping",
            burnPewter: this.abilityModes.pewter,
            storeSpeed: this.abilityModes.steel === "storing",
            tapSpeed: this.abilityModes.steel === "tapping",
        }, deltaTime);
        if (this.abilityModes.iron === "storing" && hero.metalArts.ironReserve >= hero.metalArts.ironMax) {
            this.abilityModes.iron = "normal";
        }
        if (this.abilityModes.steel === "storing" && hero.metalArts.steelReserve >= hero.metalArts.steelMax) {
            this.abilityModes.steel = "normal";
        }
        const movementEnabled = hero.isGrounded;
        const direction = movementEnabled
            ? Number(this.pressedKeys.has("KeyD")) - Number(this.pressedKeys.has("KeyA"))
            : 0;
        hero.applyMovementInput(direction, deltaTime);
        hero.isCrouching = movementEnabled && this.pressedKeys.has("KeyS");
        hero.consumeBufferedJump();
        this.updateMetalTarget();
    }

    onPointerDown(event) {
        if (![3, 4].includes(event.button) || game.state !== "playing") return;
        event.preventDefault();
        this.pointerDown = true;
        this.metalButton = event.button;
        game.hero.inputFlags.pullMetal = event.button === 3;
        game.hero.inputFlags.pushMetal = event.button === 4;
        game.canvas.setPointerCapture?.(event.pointerId);
        this.storePointerPosition(event);
        this.updateMetalTarget();
    }

    onPointerMove(event) {
        this.storePointerPosition(event);
    }

    onPointerUp(event) {
        if (event.button !== this.metalButton) return;
        event.preventDefault();
        this.releaseMetalTarget();
    }

    storePointerPosition(event) {
        const rect = game.canvas.getBoundingClientRect();
        const scaleX = game.canvas.width / rect.width;
        const scaleY = game.canvas.height / rect.height;
        this.pointerCanvasPosition = [
            (event.clientX - rect.left) * scaleX,
            (event.clientY - rect.top) * scaleY,
        ];
    }

    updateMetalTarget() {
        if (!this.pointerDown || !this.pointerCanvasPosition || !getMetalMode(game.hero)) {
            game.selectedMetalIndex = null;
            return;
        }
        const cursorX = this.pointerCanvasPosition[0] + game.camera.x;
        const cursorY = this.pointerCanvasPosition[1] + game.camera.y;
        const metals = getMetalTargets(game).map((target) => target.position);
        let closestIndex = null;
        let closestDistance = Infinity;
        for (let index = 0; index < metals.length; index++) {
            const distance = Math.hypot(metals[index][0] - cursorX, metals[index][1] - cursorY);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        }
        game.selectedMetalIndex = closestIndex;
    }

    releaseMetalTarget() {
        this.pointerDown = false;
        this.metalButton = null;
        if (game.hero) {
            game.hero.inputFlags.pullMetal = false;
            game.hero.inputFlags.pushMetal = false;
        }
        game.selectedMetalIndex = null;
        game.metalActive = false;
    }

    reset() {
        this.pressedKeys.clear();
        this.releaseMetalTarget();
    }

    resetAbilityToggles() {
        this.abilityModes.iron = "normal";
        this.abilityModes.steel = "normal";
        this.abilityModes.pewter = false;
    }

    getCursorWorldPosition() {
        if (!this.pointerCanvasPosition) return null;
        return [
            this.pointerCanvasPosition[0] + game.camera.x,
            this.pointerCanvasPosition[1] + game.camera.y,
        ];
    }
}

function getMetalMode(hero) {
    if (hero.inputFlags.pullMetal) return "pull";
    if (hero.inputFlags.pushMetal) return "push";
    return null;
}
