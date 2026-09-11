class Hero {
    constructor(x, y) {
        this.spawnPos = [x, y];
        this.globalPos = [x, y];
        this.renderPos = [0, 0];
        this.looksRight = true;
        this.vel = [0, 0];
        this.size = [30, 58];
        this.runAcceleration = 900;
        this.airControl = 0.55;
        this.groundDeceleration = 1100;
        this.jumpSpeed = 345;
        this.maxRunningSpeed = 210;
        this.maxMetalSpeed = 560;
        this.isCrouching = false;
        this.isRunning = false;
        this.isGrounded = false;
        this.coyoteTime = 0;
        this.jumpBufferTime = 0;
        this.inputFlags = { pushMetal: false, pullMetal: false };
        this.attackType = null;
        this.attackTime = 0;
        this.attackDuration = 0;
        this.attackCooldown = 0;
        this.metalArts = {
            ironReserve: 50,
            ironMax: 100,
            ironMode: "normal",
            pewterReserve: 100,
            pewterMax: 100,
            pewterActive: false,
            steelReserve: 50,
            steelMax: 100,
            steelMode: "normal",
        };
        this.animation = { state: "idle", frame: 0, elapsed: 0 };
    }

    beginStep(deltaTime, level) {
        this.isGrounded = isSpriteGrounded(this, level);
        this.coyoteTime = this.isGrounded ? 0.1 : Math.max(0, this.coyoteTime - deltaTime);
        this.jumpBufferTime = Math.max(0, this.jumpBufferTime - deltaTime);
        this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
        this.attackTime = Math.max(0, this.attackTime - deltaTime);
        if (this.attackTime === 0) this.attackType = null;
    }

    queueJump() {
        this.jumpBufferTime = 0.12;
    }

    consumeBufferedJump() {
        if (this.jumpBufferTime <= 0 || this.coyoteTime <= 0) return;
        const weightJump = this.metalArts.ironMode === "storing" ? 1.18 : this.metalArts.ironMode === "tapping" ? 0.82 : 1;
        const speedJump = Math.sqrt(this.getSpeedMultiplier());
        this.vel[1] = -this.jumpSpeed * weightJump * speedJump * this.getPewterMultiplier();
        this.jumpBufferTime = 0;
        this.coyoteTime = 0;
        this.isGrounded = false;
    }

    cutJump() {
        if (this.vel[1] < -120) this.vel[1] *= 0.5;
    }

    startAttack(type) {
        if (this.attackCooldown > 0) return false;
        const attackSpeed = this.getSpeedMultiplier() * this.getPewterMultiplier();
        this.attackType = type;
        this.attackDuration = (type === "melee" ? 0.42 : 0.28) / attackSpeed;
        this.attackTime = this.attackDuration;
        this.attackCooldown = (type === "melee" ? 0.5 : 0.4) / attackSpeed;
        return true;
    }

    updateMetalArts(controls, deltaTime) {
        const arts = this.metalArts;
        if (controls.storeWeight && !controls.tapWeight) {
            arts.ironMode = "storing";
            arts.ironReserve = Math.min(arts.ironMax, arts.ironReserve + 20 * deltaTime);
        } else if (controls.tapWeight && !controls.storeWeight && arts.ironReserve > 0) {
            arts.ironMode = "tapping";
            arts.ironReserve = Math.max(0, arts.ironReserve - 25 * deltaTime);
        } else {
            arts.ironMode = "normal";
        }

        if (controls.storeSpeed && !controls.tapSpeed) {
            arts.steelMode = "storing";
            arts.steelReserve = Math.min(arts.steelMax, arts.steelReserve + 25 * deltaTime);
        } else if (controls.tapSpeed && !controls.storeSpeed && arts.steelReserve > 0) {
            arts.steelMode = "tapping";
            arts.steelReserve = Math.max(0, arts.steelReserve - 32 * deltaTime);
        } else {
            arts.steelMode = "normal";
        }

        arts.pewterActive = controls.burnPewter && arts.pewterReserve > 0;
        if (arts.pewterActive) {
            arts.pewterReserve = Math.max(0, arts.pewterReserve - 11 * deltaTime);
        }
    }

    getWeightMultiplier() {
        if (this.metalArts.ironMode === "storing") return 0.55;
        if (this.metalArts.ironMode === "tapping") return 1.9;
        return 1;
    }

    getSpeedMultiplier() {
        if (this.metalArts.steelMode === "storing") return 0.45;
        if (this.metalArts.steelMode === "tapping") return 1.75;
        return 1;
    }

    getPewterMultiplier() {
        return this.metalArts.pewterActive ? 1.22 : 1;
    }

    applyMovementInput(direction, deltaTime) {
        this.isRunning = direction !== 0;
        const speedMultiplier = this.getSpeedMultiplier();
        const pewterMultiplier = this.getPewterMultiplier();
        if (direction !== 0) {
            const control = this.isGrounded ? 1 : this.airControl;
            const acceleration = this.runAcceleration * control * speedMultiplier * pewterMultiplier;
            const maxSpeed = this.maxRunningSpeed * speedMultiplier * pewterMultiplier;
            this.vel[0] += direction * acceleration * deltaTime;
            this.vel[0] = Math.max(-maxSpeed, Math.min(maxSpeed, this.vel[0]));
        } else if (this.isGrounded) {
            const amount = this.groundDeceleration * speedMultiplier * deltaTime;
            this.vel[0] = Math.abs(this.vel[0]) <= amount ? 0 : this.vel[0] - Math.sign(this.vel[0]) * amount;
        }
    }

    applyMetalForce(target, mode, deltaTime, range) {
        if (!target || !mode) return false;
        const centerY = this.globalPos[1] - this.size[1] / 2;
        let deltaX = target[0] - this.globalPos[0];
        let deltaY = target[1] - centerY;
        const distance = Math.hypot(deltaX, deltaY);
        if (distance < 24 || distance > range) return false;
        deltaX /= distance;
        deltaY /= distance;
        const direction = mode === "pull" ? 1 : -1;
        const distanceRatio = distance / range;
        const reducedDistancePenalty = 780 * 0.7 * distanceRatio;
        const acceleration = (1300 - reducedDistancePenalty) / this.getWeightMultiplier();
        this.vel[0] += deltaX * direction * acceleration * deltaTime;
        this.vel[1] += deltaY * direction * acceleration * deltaTime;
        const speed = Math.hypot(this.vel[0], this.vel[1]);
        if (speed > this.maxMetalSpeed) {
            this.vel[0] = this.vel[0] / speed * this.maxMetalSpeed;
            this.vel[1] = this.vel[1] / speed * this.maxMetalSpeed;
        }
        return true;
    }

    update(deltaTime, level, gravity) {
        const weightGravity = this.metalArts.ironMode === "storing" ? 0.84 : this.metalArts.ironMode === "tapping" ? 1.18 : 1;
        this.vel[1] += gravity * weightGravity * deltaTime;
        const distance = Math.max(Math.abs(this.vel[0] * deltaTime), Math.abs(this.vel[1] * deltaTime));
        const steps = Math.max(1, Math.ceil(distance / (TILE_SIZE / 3)));
        const stepTime = deltaTime / steps;
        for (let step = 0; step < steps; step++) {
            const collisions = moveSpriteWithTileCollisions(this, this.vel[0] * stepTime, this.vel[1] * stepTime, level);
            if ((collisions.left && this.vel[0] < 0) || (collisions.right && this.vel[0] > 0)) this.vel[0] = 0;
            if ((collisions.top && this.vel[1] < 0) || (collisions.bottom && this.vel[1] > 0)) this.vel[1] = 0;
        }
        this.isGrounded = isSpriteGrounded(this, level);
        if (this.vel[0] !== 0) this.looksRight = this.vel[0] > 0;
        this.updateAnimation(deltaTime * this.getSpeedMultiplier());
    }

    updateAnimation(deltaTime) {
        let state = "idle";
        if (this.attackTime > 0) state = "attack";
        else if (this.isCrouching && this.isGrounded) state = "crouch";
        else if (!this.isGrounded) state = "jump";
        else if (Math.abs(this.vel[0]) > 15) state = "run";
        if (state !== this.animation.state) this.animation = { state, frame: 0, elapsed: 0 };
        const frameCounts = { idle: 4, run: 6, jump: 4, attack: 5, crouch: 1 };
        const frameDurations = { idle: 0.16, run: 0.09, jump: 0.12, attack: 0.08, crouch: 1 };
        this.animation.elapsed += deltaTime;
        if (this.animation.elapsed >= frameDurations[state]) {
            this.animation.elapsed %= frameDurations[state];
            this.animation.frame = (this.animation.frame + 1) % frameCounts[state];
        }
    }

    draw(context, sprites) {
        const direction = this.looksRight ? "right" : "left";
        const image = sprites[`${this.animation.state}-${direction}`];
        const frameWidth = 100;
        context.drawImage(
            image,
            this.animation.frame * frameWidth,
            0,
            frameWidth,
            image.height,
            Math.round(this.renderPos[0] - frameWidth / 2),
            Math.round(this.renderPos[1] - image.height),
            frameWidth,
            image.height,
        );
        this.drawMetalArtEffects(context);
        if (this.attackType === "melee") this.drawMeleeArc(context);
    }

    drawMetalArtEffects(context) {
        if (!this.metalArts.pewterActive && this.metalArts.ironMode === "normal" && this.metalArts.steelMode === "normal") return;
        context.save();
        if (this.metalArts.pewterActive) {
            context.strokeStyle = "rgba(190, 125, 255, 0.75)";
            context.lineWidth = 3;
            context.beginPath();
            context.ellipse(this.renderPos[0], this.renderPos[1] - this.size[1] / 2, 24, 34, 0, 0, Math.PI * 2);
            context.stroke();
        }
        if (this.metalArts.ironMode !== "normal") {
            context.fillStyle = this.metalArts.ironMode === "storing" ? "#9dd8ff" : "#48758e";
            context.beginPath();
            context.arc(this.renderPos[0] - 20, this.renderPos[1] - 4, 5 * Math.sqrt(this.getWeightMultiplier()), 0, Math.PI * 2);
            context.fill();
        }
        if (this.metalArts.steelMode !== "normal" && Math.abs(this.vel[0]) > 10) {
            context.strokeStyle = this.metalArts.steelMode === "tapping" ? "rgba(225, 245, 255, 0.8)" : "rgba(120, 155, 175, 0.5)";
            context.lineWidth = 2;
            for (let offset = -1; offset <= 1; offset++) {
                context.beginPath();
                context.moveTo(this.renderPos[0] - Math.sign(this.vel[0]) * 18, this.renderPos[1] - 24 + offset * 9);
                context.lineTo(this.renderPos[0] - Math.sign(this.vel[0]) * 42, this.renderPos[1] - 24 + offset * 9);
                context.stroke();
            }
        }
        context.restore();
    }

    drawMeleeArc(context) {
        const progress = 1 - this.attackTime / this.attackDuration;
        const direction = this.looksRight ? 1 : -1;
        const centerX = this.renderPos[0] + direction * 18;
        const centerY = this.renderPos[1] - this.size[1] / 2;
        const startAngle = this.looksRight ? -1.2 + progress * 0.8 : Math.PI + 0.4 - progress * 0.8;
        context.save();
        context.strokeStyle = "rgba(245, 235, 205, 0.85)";
        context.lineWidth = 4;
        context.beginPath();
        const radius = 34 * this.getPewterMultiplier();
        context.arc(centerX, centerY, radius, startAngle, startAngle + direction * 1.25, direction < 0);
        context.stroke();
        context.restore();
    }

    adjustRenderPos(cameraX, cameraY) {
        this.renderPos[0] = this.globalPos[0] - cameraX;
        this.renderPos[1] = this.globalPos[1] - cameraY;
    }
}
