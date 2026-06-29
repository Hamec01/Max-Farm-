import Phaser from "phaser";
import { playChickTone, playCollectTone, playStepTone, playWarnTone, unlockStage1Audio } from "../audio";
import {
  STAGE1_ANIMAL_DEFS,
  STAGE1_BIRD_PENS,
  STAGE1_CROP_DEFS,
  STAGE1_GARDEN_PLOT_LAYOUT,
  STAGE1_GARDEN_PLOT_ORDER,
  STAGE1_PLAYER_SPEED,
  STAGE1_WORKER_SPEED,
  STAGE1_WORLD,
} from "../content";
import { stage1Events } from "../events";
import { stage1Session } from "../session";
import type { Stage1AnimalState, Stage1LocationId, Stage1TaskState } from "../types";

type WorkerPhase = "idle" | "walkToTask" | "work" | "returnHome" | "cooldown";

interface PlayerRuntime {
  x: number;
  targetX: number;
  facing: 1 | -1;
  interactionAnimalId: string | null;
  interactionPlotId: string | null;
  interactionPenId: string | null;
  interactOnArrival: boolean;
  stepTimer: number;
}

interface BirdRuntime {
  sprite: Phaser.GameObjects.Image;
  baseScale: number;
  wanderCooldown: number;
  reactionTimer: number;
  targetX: number;
}

interface WorkerRuntime {
  sprite: Phaser.GameObjects.Image;
  homeX: number;
  x: number;
  targetX: number;
  currentTaskId: string | null;
  phase: WorkerPhase;
  timer: number;
}

interface PlotRuntime {
  hitArea: Phaser.GameObjects.Rectangle;
  soil: Phaser.GameObjects.Rectangle;
  crop: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text;
  progressBg: Phaser.GameObjects.Rectangle;
  progressFill: Phaser.GameObjects.Rectangle;
}

interface PenRuntime {
  hitArea: Phaser.GameObjects.Rectangle;
  body: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text;
}

export class WorldScene extends Phaser.Scene {
  private static readonly UI_TOP_SAFE_ZONE = 196;
  private static readonly UI_BOTTOM_SAFE_ZONE = 132;

  private player!: Phaser.GameObjects.Image;
  private playerRuntime!: PlayerRuntime;
  private workerRuntime!: WorkerRuntime;
  private birdRuntime = new Map<string, BirdRuntime>();
  private plotRuntime = new Map<string, PlotRuntime>();
  private penRuntime = new Map<string, PenRuntime>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private holdLeft = false;
  private holdRight = false;
  private shopOpen = false;
  private meadowContainer!: Phaser.GameObjects.Container;
  private gardenContainer!: Phaser.GameObjects.Container;
  private interactionZone!: Phaser.GameObjects.Zone;
  private currentLocation: Stage1LocationId = "MEADOW";
  private snapshot = stage1Session.getSnapshot();
  private unsubscribeSession?: () => void;
  private readonly handleControlHold = (direction: "left" | "right", isHeld: boolean) => {
    if (direction === "left") {
      this.holdLeft = isHeld;
    } else {
      this.holdRight = isHeld;
    }
  };
  private readonly handleShopToggled = (isOpen: boolean) => {
    this.shopOpen = isOpen;
    if (isOpen) {
      this.refreshPrompt("Магазин открыт.");
    } else {
      this.refreshPrompt(this.currentLocation === "MEADOW"
        ? "Корми птиц, собирай продукты и следи за чистотой."
        : "Сажай, поливай и собирай урожай.");
    }
  };

  constructor() {
    super("WorldScene");
  }

  create() {
    this.createWorld();
    this.createPlayer();
    this.createWorker();
    this.createAnimals();
    this.applyLocation("MEADOW");
    this.bindInput();
    this.bindSession();
    this.refreshPrompt("Коснись земли, чтобы вести Макса.");
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.05);

    stage1Session.tick(dt);
    this.updatePlayer(dt);
    this.updateBirds(dt);
    this.updateWorker(dt);
    this.syncSpritesFromState();
  }

  private fitSpriteToHeight(sprite: Phaser.GameObjects.Image, targetHeight: number) {
    const source = sprite.texture.getSourceImage() as { width?: number; height?: number };
    const sourceWidth = Math.max(1, source.width ?? sprite.width ?? targetHeight);
    const sourceHeight = Math.max(1, source.height ?? sprite.height ?? targetHeight);
    const targetWidth = sourceWidth * (targetHeight / sourceHeight);
    sprite.setDisplaySize(targetWidth, targetHeight);
  }

  private createWorld() {
    const meadowBg = this.add.image(0, 0, "meadow-bg").setOrigin(0, 0);
    meadowBg.setDisplaySize(STAGE1_WORLD.locations.MEADOW.width, STAGE1_WORLD.height);
    this.meadowContainer = this.add.container(0, 0, [meadowBg]);
    this.createBirdPens();

    const gardenBg = this.add.image(0, 0, "garden-bg").setOrigin(0, 0);
    gardenBg.setDisplaySize(STAGE1_WORLD.locations.GARDEN.width, STAGE1_WORLD.height);
    const gardenShade = this.add.rectangle(
      STAGE1_WORLD.locations.GARDEN.width / 2,
      STAGE1_WORLD.height - 118,
      STAGE1_WORLD.locations.GARDEN.width,
      236,
      0x1a1208,
      0.08,
    );
    const gardenTitle = this.add.text(STAGE1_WORLD.locations.GARDEN.width / 2, 86, "Огород Макса", {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "44px",
      color: "#fff8d4",
      stroke: "#3f5d22",
      strokeThickness: 8,
    }).setOrigin(0.5);
    gardenTitle.setDepth(2);
    this.gardenContainer = this.add.container(0, 0, [gardenBg, gardenShade, gardenTitle]);

    this.interactionZone = this.add.zone(
      0,
      WorldScene.UI_TOP_SAFE_ZONE,
      STAGE1_WORLD.locations.MEADOW.width,
      STAGE1_WORLD.height - WorldScene.UI_TOP_SAFE_ZONE - WorldScene.UI_BOTTOM_SAFE_ZONE,
    )
      .setOrigin(0, 0)
      .setInteractive();
    this.interactionZone.setDepth(-50);
    this.interactionZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.shopOpen) {
        return;
      }

      unlockStage1Audio();
      stage1Events.emit("plot:close");
      stage1Events.emit("pen:close");
      this.playerRuntime.interactionAnimalId = null;
      this.playerRuntime.interactionPlotId = null;
      this.playerRuntime.interactionPenId = null;
      this.playerRuntime.interactOnArrival = false;
      const lane = this.getActiveLane();
      this.playerRuntime.targetX = Phaser.Math.Clamp(pointer.worldX, lane.minX, lane.maxX);
      this.refreshPrompt(this.currentLocation === "MEADOW" ? "Макс идет по лугу." : "Макс идет к грядкам.");
    });

    this.createGardenPlots();
    this.cameras.main.setRoundPixels(true);

    this.scale.on("resize", this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize, this);
    });
  }

  private createBirdPens() {
    for (const pen of Object.values(STAGE1_BIRD_PENS)) {
      const hitArea = this.add.rectangle(
        pen.centerX,
        pen.groundY - 62,
        pen.maxX - pen.minX + 80,
        178,
        0xffffff,
        0.001,
      ).setInteractive({ useHandCursor: true });
      hitArea.setDepth(4);
      const body = this.add.rectangle(
        pen.centerX,
        pen.groundY - 62,
        pen.maxX - pen.minX,
        126,
        0xffffff,
        0.12,
      ).setStrokeStyle(4, 0xe9d08f, 0.95);
      body.setDepth(2);
      const title = this.add.text(pen.centerX, pen.groundY - 106, pen.nameRu, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "22px",
        color: "#fff7dc",
        stroke: "#5f3a1f",
        strokeThickness: 6,
      }).setOrigin(0.5);
      title.setDepth(3);
      const status = this.add.text(pen.centerX, pen.groundY - 20, "", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "18px",
        color: "#fff5d8",
        stroke: "#5a3718",
        strokeThickness: 5,
      }).setOrigin(0.5);
      status.setDepth(3);
      hitArea.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        if (this.shopOpen || this.currentLocation !== "MEADOW") {
          return;
        }

        unlockStage1Audio();
        stage1Events.emit("plot:close");
        const lane = STAGE1_WORLD.locations.MEADOW.lanes["meadow-main"];
        this.playerRuntime.targetX = Phaser.Math.Clamp(pen.centerX - 36, lane.minX, lane.maxX);
        this.playerRuntime.interactionAnimalId = null;
        this.playerRuntime.interactionPlotId = null;
        this.playerRuntime.interactionPenId = pen.id;
        this.playerRuntime.interactOnArrival = true;
        this.refreshPrompt("Макс идет к загону.");
      });
      this.meadowContainer.add([body, hitArea, title, status]);
      this.penRuntime.set(pen.id, { hitArea, body, title, status });
    }
  }

  private createPlayer() {
    const lane = STAGE1_WORLD.locations.MEADOW.lanes["meadow-main"];
    this.player = this.add.image(460, lane.y, "max-idle");
    this.player.setOrigin(0.5, 1);
    this.fitSpriteToHeight(this.player, 158);
    this.player.setDepth(8);

    this.playerRuntime = {
      x: this.player.x,
      targetX: this.player.x,
      facing: 1,
      interactionAnimalId: null,
      interactionPlotId: null,
      interactionPenId: null,
      interactOnArrival: false,
      stepTimer: 0,
    };

    this.cameras.main.startFollow(this.player, false, 0.1, 0.1, 0, 0);
    this.cameras.main.followOffset.set(0, (STAGE1_WORLD.height - this.scale.height / this.cameras.main.zoom) / 2);
  }

  private createWorker() {
    const lane = STAGE1_WORLD.locations.MEADOW.lanes["meadow-main"];
    const sprite = this.add.image(520, lane.y, "worker-mama");
    sprite.setOrigin(0.5, 1);
    this.fitSpriteToHeight(sprite, 150);
    sprite.setDepth(7);
    this.workerRuntime = {
      sprite,
      homeX: 520,
      x: 520,
      targetX: 520,
      currentTaskId: null,
      phase: "idle",
      timer: 0,
    };
  }

  private createAnimals() {
    for (const animal of this.snapshot.state.animals) {
      this.spawnAnimalSprite(animal);
    }
  }

  private createGardenPlots() {
    for (const plotId of STAGE1_GARDEN_PLOT_ORDER) {
      const pos = STAGE1_GARDEN_PLOT_LAYOUT[plotId];
      const plotShadow = this.add.ellipse(pos.x, pos.y + 42, 212, 34, 0x000000, 0.18);
      plotShadow.setDepth(3);
      const hitArea = this.add.rectangle(pos.x, pos.y, 236, 154, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      hitArea.setDepth(6);
      const soil = this.add.rectangle(pos.x, pos.y, 196, 92, 0x6d4626, 0.94)
        .setStrokeStyle(5, 0xc08b56, 0.95);
      soil.setDepth(5);
      const furrow1 = this.add.rectangle(pos.x - 44, pos.y, 14, 82, 0x543019, 0.45);
      const furrow2 = this.add.rectangle(pos.x, pos.y, 14, 82, 0x543019, 0.45);
      const furrow3 = this.add.rectangle(pos.x + 44, pos.y, 14, 82, 0x543019, 0.45);
      furrow1.setDepth(6);
      furrow2.setDepth(6);
      furrow3.setDepth(6);
      const crop = this.add.text(pos.x, pos.y - 8, "Пусто", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "22px",
        color: "#fff3cf",
      }).setOrigin(0.5);
      crop.setDepth(7);
      const status = this.add.text(pos.x, pos.y + 22, "Нажми", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#f5e6bf",
        align: "center",
      }).setOrigin(0.5);
      status.setDepth(7);
      const progressBg = this.add.rectangle(pos.x, pos.y + 46, 140, 8, 0x312114, 0.95)
        .setStrokeStyle(1, 0xe9cd8f, 0.35);
      progressBg.setDepth(7);
      const progressFill = this.add.rectangle(pos.x - 70, pos.y + 46, 0, 6, 0x8be05f, 1).setOrigin(0, 0.5);
      progressFill.setDepth(8);

      hitArea.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        if (this.shopOpen) {
          return;
        }
        unlockStage1Audio();
        stage1Events.emit("pen:close");
        if (!stage1Session.isPlotUnlocked(plotId)) {
          playWarnTone();
          stage1Events.emit("feedback:show", "Эта грядка откроется позже.", "warn");
          this.refreshPrompt("Эта грядка пока закрыта.");
          return;
        }
        const lane = STAGE1_WORLD.locations.GARDEN.lanes["garden-main"];
        this.playerRuntime.targetX = Phaser.Math.Clamp(pos.x, lane.minX, lane.maxX);
        this.playerRuntime.interactionAnimalId = null;
        this.playerRuntime.interactionPlotId = plotId;
        this.playerRuntime.interactionPenId = null;
        this.playerRuntime.interactOnArrival = true;
        this.refreshPrompt("Макс идет к грядке.");
      });

      this.gardenContainer.add([plotShadow, soil, furrow1, furrow2, furrow3, hitArea, crop, status, progressBg, progressFill]);
      this.plotRuntime.set(plotId, { hitArea, soil, crop, status, progressBg, progressFill });
    }
  }

  private getAnimalTexture(animal: Stage1AnimalState) {
    return `bird-${animal.species}-${animal.mood}`;
  }

  private spawnAnimalSprite(animal: Stage1AnimalState) {
    const def = STAGE1_ANIMAL_DEFS[animal.species];
    const sprite = this.add.image(animal.position.x, this.resolveLaneY(animal.position.laneId), this.getAnimalTexture(animal));
    sprite.setOrigin(0.5, 1);
    this.fitSpriteToHeight(sprite, def.spriteHeight);
    sprite.setDepth(6);
    sprite.setInteractive({ useHandCursor: true });
    sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.shopOpen || this.currentLocation !== "MEADOW") {
        return;
      }

      unlockStage1Audio();
      stage1Events.emit("plot:close");
      stage1Events.emit("pen:close");
      const lane = STAGE1_WORLD.locations.MEADOW.lanes["meadow-main"];
      this.playerRuntime.targetX = Phaser.Math.Clamp(animal.position.x + 78, lane.minX, lane.maxX);
      this.playerRuntime.interactionAnimalId = animal.id;
      this.playerRuntime.interactionPlotId = null;
      this.playerRuntime.interactionPenId = null;
      this.playerRuntime.interactOnArrival = true;
      this.refreshPrompt(`Макс идет к ${animal.name}.`);
    });

    this.birdRuntime.set(animal.id, {
      sprite,
      baseScale: sprite.scaleX,
      wanderCooldown: Phaser.Math.FloatBetween(1.2, 2.8),
      reactionTimer: 0,
      targetX: animal.position.x,
    });
  }

  private bindInput() {
    this.cursors = this.input.keyboard?.createCursorKeys() ?? ({} as Phaser.Types.Input.Keyboard.CursorKeys);
    this.keys = {
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.input.on("pointerdown", () => unlockStage1Audio());

    stage1Events.on("control:hold", this.handleControlHold, this);
    stage1Events.on("shop:toggled", this.handleShopToggled, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stage1Events.off("control:hold", this.handleControlHold, this);
      stage1Events.off("shop:toggled", this.handleShopToggled, this);
    });
  }

  private bindSession() {
    this.unsubscribeSession = stage1Session.subscribe((snapshot) => {
      this.snapshot = snapshot;
      if (snapshot.state.activeLocation !== this.currentLocation) {
        this.applyLocation(snapshot.state.activeLocation);
      }
      this.syncAnimalRuntime();
      this.syncPenRuntime();
      this.syncGardenRuntime();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeSession?.();
      this.unsubscribeSession = undefined;
    });
  }

  private updatePlayer(dt: number) {
    if (this.shopOpen) {
      return;
    }

    const moveDir =
      this.holdLeft || this.cursors.left?.isDown || this.keys.left.isDown ? -1 :
      this.holdRight || this.cursors.right?.isDown || this.keys.right.isDown ? 1 :
      0;

    if (moveDir !== 0) {
      this.playerRuntime.targetX = Phaser.Math.Clamp(
        this.playerRuntime.x + moveDir * STAGE1_PLAYER_SPEED * dt,
        this.getActiveLane().minX,
        this.getActiveLane().maxX,
      );
      stage1Events.emit("plot:close");
      stage1Events.emit("pen:close");
      this.playerRuntime.interactionAnimalId = null;
      this.playerRuntime.interactionPlotId = null;
      this.playerRuntime.interactionPenId = null;
      this.playerRuntime.interactOnArrival = false;
    }

    const distance = this.playerRuntime.targetX - this.playerRuntime.x;
    if (Math.abs(distance) <= 2) {
      this.playerRuntime.x = this.playerRuntime.targetX;
      this.player.setX(this.playerRuntime.x);
      if (this.playerRuntime.interactOnArrival) {
        if (this.playerRuntime.interactionAnimalId) {
          this.handleAnimalInteraction(this.playerRuntime.interactionAnimalId);
        } else if (this.playerRuntime.interactionPlotId) {
          this.handleGardenPlotInteraction(this.playerRuntime.interactionPlotId);
        } else if (this.playerRuntime.interactionPenId) {
          this.handlePenInteraction(this.playerRuntime.interactionPenId);
        }
        this.playerRuntime.interactionAnimalId = null;
        this.playerRuntime.interactionPlotId = null;
        this.playerRuntime.interactionPenId = null;
        this.playerRuntime.interactOnArrival = false;
      }
      return;
    }

    const step = Math.sign(distance) * STAGE1_PLAYER_SPEED * dt;
    this.playerRuntime.x += Math.abs(step) >= Math.abs(distance) ? distance : step;
    this.playerRuntime.facing = distance >= 0 ? 1 : -1;
    this.player.setFlipX(this.playerRuntime.facing < 0);
    this.player.setX(this.playerRuntime.x);

    this.playerRuntime.stepTimer += dt;
    if (this.playerRuntime.stepTimer >= 0.24) {
      this.playerRuntime.stepTimer = 0;
      playStepTone();
    }
  }

  private updateBirds(dt: number) {
    for (const animal of this.snapshot.state.animals) {
      const runtime = this.birdRuntime.get(animal.id);
      if (!runtime) {
        continue;
      }

      const def = STAGE1_ANIMAL_DEFS[animal.species];
      if (runtime.reactionTimer > 0) {
        runtime.reactionTimer -= dt;
      }

      runtime.wanderCooldown -= dt;
      if (runtime.wanderCooldown <= 0 && !animal.hasProduct) {
        const pen = STAGE1_BIRD_PENS[animal.penId];
        const offset = Phaser.Math.Between(-def.wanderStep, def.wanderStep);
        runtime.targetX = Phaser.Math.Clamp(
          animal.position.x + offset,
          pen.minX + 36,
          pen.maxX - 36,
        );
        runtime.wanderCooldown = Phaser.Math.FloatBetween(1.4, 3.2);
      }

      const dx = runtime.targetX - animal.position.x;
      if (Math.abs(dx) > 1) {
        animal.position.x += Math.sign(dx) * Math.min(Math.abs(dx), 70 * dt);
      }

      runtime.sprite.setTexture(this.getAnimalTexture(animal));
      runtime.sprite.setFlipX(dx < 0);
      runtime.sprite.y = this.resolveLaneY(animal.position.laneId) - Math.sin(this.time.now / 140) * 2;
    }
  }

  private updateWorker(dt: number) {
    const worker = stage1Session.getWorker();
    if (!worker.isActive || this.currentLocation !== "MEADOW") {
      if (this.workerRuntime.currentTaskId) {
        stage1Session.releaseTask(this.workerRuntime.currentTaskId, worker.id);
      }
      this.workerRuntime.phase = "idle";
      this.workerRuntime.currentTaskId = null;
      this.workerRuntime.targetX = this.workerRuntime.homeX;
      this.moveWorkerTowards(this.workerRuntime.homeX, dt);
      return;
    }

    switch (this.workerRuntime.phase) {
      case "idle": {
        const task = stage1Session.reserveTaskForWorker(worker.id);
        if (task) {
          this.workerRuntime.currentTaskId = task.id;
          this.workerRuntime.targetX = stage1Session.getTaskTargetX(task) - 72;
          this.workerRuntime.phase = "walkToTask";
          this.refreshPrompt(this.getTaskPrompt(task));
        } else {
          this.moveWorkerTowards(this.workerRuntime.homeX, dt);
        }
        break;
      }

      case "walkToTask":
        if (this.moveWorkerTowards(this.workerRuntime.targetX, dt)) {
          this.workerRuntime.phase = "work";
          this.workerRuntime.timer = 0.7;
        }
        break;

      case "work":
        this.workerRuntime.timer -= dt;
        if (this.workerRuntime.timer <= 0 && this.workerRuntime.currentTaskId) {
          const result = stage1Session.completeReservedTask(this.workerRuntime.currentTaskId, worker.id);
          if (result.ok) {
            playCollectTone();
          } else {
            playWarnTone();
          }
          stage1Events.emit("feedback:show", result.message, result.tone);
          this.workerRuntime.phase = "returnHome";
          this.workerRuntime.targetX = this.workerRuntime.homeX;
          this.workerRuntime.currentTaskId = null;
        }
        break;

      case "returnHome":
        if (this.moveWorkerTowards(this.workerRuntime.homeX, dt)) {
          this.workerRuntime.phase = "cooldown";
          this.workerRuntime.timer = 1.2;
        }
        break;

      case "cooldown":
        this.workerRuntime.timer -= dt;
        if (this.workerRuntime.timer <= 0) {
          this.workerRuntime.phase = "idle";
        }
        break;
    }
  }

  private moveWorkerTowards(targetX: number, dt: number) {
    const distance = targetX - this.workerRuntime.x;
    if (Math.abs(distance) <= 2) {
      this.workerRuntime.x = targetX;
      this.workerRuntime.sprite.setX(this.workerRuntime.x);
      return true;
    }

    const step = Math.sign(distance) * STAGE1_WORKER_SPEED * dt;
    this.workerRuntime.x += Math.abs(step) >= Math.abs(distance) ? distance : step;
    this.workerRuntime.sprite.setX(this.workerRuntime.x);
    this.workerRuntime.sprite.setFlipX(distance < 0);
    return false;
  }

  private handleAnimalInteraction(animalId: string) {
    const animal = this.snapshot.state.animals.find((entry) => entry.id === animalId);
    if (!animal) {
      return;
    }

    let result;
    if (animal.hasProduct) {
      result = stage1Session.collectProduct(animal.id);
      playCollectTone();
    } else if (animal.hunger >= 75) {
      result = stage1Session.feedAnimal(animal.id, "player");
      if (result.ok) {
        playChickTone();
      } else {
        playWarnTone();
      }
    } else {
      playChickTone();
      result = { ok: true, message: `${animal.name} сыт и рад.`, tone: "info" } as const;
    }

    const runtime = this.birdRuntime.get(animal.id);
    if (runtime) {
      runtime.reactionTimer = 0.4;
    }

    stage1Events.emit("feedback:show", result.message, result.tone);
    this.refreshPrompt(result.message);
  }

  private handleGardenPlotInteraction(plotId: string) {
    stage1Events.emit("plot:open", plotId);
    this.refreshPrompt("Выбери действие для грядки.");
  }

  private handlePenInteraction(penId: string) {
    stage1Events.emit("pen:open", penId);
    this.refreshPrompt("Выбери, что делать в загоне.");
  }

  private getTaskPrompt(task: Pick<Stage1TaskState, "type" | "targetId">) {
    if (task.type === "feed-animal") {
      const animal = this.snapshot.state.animals.find((entry) => entry.id === task.targetId);
      return `Мама идет кормить ${animal?.name ?? "птичку"}.`;
    }
    if (task.type === "collect-product") {
      return "Мама идет собирать продукт.";
    }
    return "Мама идет убирать загон.";
  }

  private syncAnimalRuntime() {
    const ids = new Set(this.snapshot.state.animals.map((animal) => animal.id));
    for (const animal of this.snapshot.state.animals) {
      if (!this.birdRuntime.has(animal.id)) {
        this.spawnAnimalSprite(animal);
      }
    }

    for (const [id, runtime] of this.birdRuntime) {
      if (!ids.has(id)) {
        runtime.sprite.destroy();
        this.birdRuntime.delete(id);
      }
    }
  }

  private syncPenRuntime() {
    for (const [penId, runtime] of this.penRuntime) {
      const penDef = STAGE1_BIRD_PENS[penId];
      const penState = this.snapshot.state.pens[penId];
      const owned = Boolean(penState?.isOwned);
      const occupancy = stage1Session.getPenOccupancy(penId);
      runtime.hitArea.setVisible(this.currentLocation === "MEADOW");
      runtime.body.setVisible(true);
      runtime.title.setVisible(true);
      runtime.status.setVisible(true);
      if (!owned) {
        runtime.body.setFillStyle(0x5d4738, 0.2);
        runtime.title.setText("Новый загон");
        runtime.status.setText(`${penDef.cost} монет`);
        continue;
      }

      const cleanliness = Math.round(penState.cleanliness);
      runtime.title.setText(penDef.nameRu);
      runtime.body.setFillStyle(cleanliness < 46 ? 0x835129 : 0xffffff, cleanliness < 46 ? 0.24 : 0.12);
      runtime.status.setText(`${occupancy}/${penDef.capacity}  •  Чисто ${cleanliness}%`);
    }
  }

  private syncGardenRuntime() {
    for (const [plotId, plot] of Object.entries(this.snapshot.state.crops)) {
      const runtime = this.plotRuntime.get(plotId);
      if (!runtime) {
        continue;
      }

      if (!stage1Session.isPlotUnlocked(plotId)) {
        runtime.crop.setText("Закрыто");
        runtime.status.setText("Позже");
        runtime.soil.setFillStyle(0x554236, 1);
        runtime.soil.setAlpha(0.72);
        runtime.crop.setAlpha(0.85);
        runtime.status.setAlpha(0.85);
        runtime.progressFill.width = 0;
        runtime.progressFill.setFillStyle(0x8be05f, 1);
        continue;
      }

      runtime.soil.setAlpha(1);
      runtime.crop.setAlpha(1);
      runtime.status.setAlpha(1);

      if (!plot.cropType) {
        runtime.crop.setText("Пусто");
        runtime.status.setText("Нажми");
        runtime.soil.setFillStyle(0x6d4626, 1);
        runtime.progressFill.width = 0;
        runtime.progressFill.setFillStyle(0x8be05f, 1);
        continue;
      }

      const cropDef = STAGE1_CROP_DEFS[plot.cropType];
      const stageIcon =
        plot.growth >= 1 ? "*" :
        plot.growth >= 0.66 ? "+" :
        plot.growth >= 0.33 ? "." :
        "'";
      runtime.crop.setText(`${stageIcon} ${cropDef.nameRu}`);
      runtime.status.setText(
        plot.growth >= 1
          ? "Собрать"
          : plot.watered
            ? `Рост ${Math.round(plot.growth * 100)}%`
            : "Нужна вода",
      );
      runtime.soil.setFillStyle(plot.growth >= 1 ? 0x3d8f2f : plot.watered ? 0x7b4c29 : 0x6d4626, 1);
      runtime.progressFill.width = 140 * plot.growth;
      runtime.progressFill.setFillStyle(plot.growth >= 1 ? 0xf1ca65 : 0x8be05f, 1);
    }
  }

  private syncSpritesFromState() {
    for (const animal of this.snapshot.state.animals) {
      const runtime = this.birdRuntime.get(animal.id);
      if (!runtime) {
        continue;
      }
      runtime.sprite.setPosition(animal.position.x, this.resolveLaneY(animal.position.laneId));
      runtime.sprite.setTexture(this.getAnimalTexture(animal));
      runtime.sprite.setScale(runtime.baseScale * (runtime.reactionTimer > 0 ? 1.06 : 1));
      runtime.sprite.setVisible(this.currentLocation === "MEADOW");
    }

    this.workerRuntime.sprite.setY(this.getActiveLane().y);
    this.workerRuntime.sprite.setVisible(this.currentLocation === "MEADOW");
  }

  private applyLocation(location: Stage1LocationId) {
    this.currentLocation = location;
    const locationDef = STAGE1_WORLD.locations[location];
    this.meadowContainer.setVisible(location === "MEADOW");
    this.gardenContainer.setVisible(location === "GARDEN");
    this.cameras.main.setBounds(0, 0, locationDef.width, STAGE1_WORLD.height);
    this.interactionZone.setPosition(0, WorldScene.UI_TOP_SAFE_ZONE);
    this.interactionZone.setSize(
      locationDef.width,
      STAGE1_WORLD.height - WorldScene.UI_TOP_SAFE_ZONE - WorldScene.UI_BOTTOM_SAFE_ZONE,
    );
    this.playerRuntime.targetX = Phaser.Math.Clamp(this.playerRuntime.targetX, this.getActiveLane().minX, this.getActiveLane().maxX);
    this.playerRuntime.x = Phaser.Math.Clamp(this.playerRuntime.x, this.getActiveLane().minX, this.getActiveLane().maxX);
    this.player.setPosition(this.playerRuntime.x, locationDef.groundY);
    this.workerRuntime.sprite.setY(locationDef.groundY);
    this.updateCameraScale();
    this.syncSpritesFromState();
    this.syncPenRuntime();
    this.syncGardenRuntime();
    this.refreshPrompt(location === "MEADOW"
      ? "Луг открыт: ухаживай за птичьим двором."
      : "Грядки открыты: сажай и поливай.");
  }

  private getActiveLane() {
    return this.currentLocation === "GARDEN"
      ? STAGE1_WORLD.locations.GARDEN.lanes["garden-main"]
      : STAGE1_WORLD.locations.MEADOW.lanes["meadow-main"];
  }

  private resolveLaneY(laneId: string) {
    return laneId === "garden-main"
      ? STAGE1_WORLD.locations.GARDEN.lanes["garden-main"].y
      : STAGE1_WORLD.locations.MEADOW.lanes["meadow-main"].y;
  }

  private refreshPrompt(message: string) {
    stage1Events.emit("prompt:update", message);
  }

  private updateCameraScale() {
    this.cameras.main.setZoom(this.scale.height / STAGE1_WORLD.height);
    this.cameras.main.setScroll(0, 0);
  }

  private handleResize() {
    this.updateCameraScale();
    this.cameras.main.centerOn(this.player.x, STAGE1_WORLD.height / 2);
  }
}
