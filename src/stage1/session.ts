import {
  STAGE1_ANIMAL_DEFS,
  STAGE1_BIRD_PENS,
  STAGE1_BUY_PEN_XP,
  STAGE1_CLEAN_PEN_XP,
  STAGE1_CROP_DEFS,
  STAGE1_CROP_UNLOCKS,
  STAGE1_FEED_XP,
  STAGE1_HARVEST_XP,
  STAGE1_INTERACTION_RANGE,
  STAGE1_PEN_ORDER,
  STAGE1_RESCUE_SEED_GRANT,
  STAGE1_SEED_KEYS,
  STAGE1_STARTING_BIRD_SPECIES,
  STAGE1_UPGRADE,
  STAGE1_WHEAT_UPGRADE,
  STAGE1_WORKER_TEMPLATE,
  STAGE1_WORLD,
  createDefaultAnimal,
  createDefaultStage1State,
  getNextLevelExperience,
} from "./content";
import { loadStage1SaveData, loadStage1State, persistStage1State } from "./save";
import type {
  Stage1AnimalDefinition,
  Stage1AnimalSpecies,
  Stage1AnimalState,
  Stage1CommandResult,
  Stage1CropType,
  Stage1PersistentState,
  Stage1Snapshot,
  Stage1TaskState,
  Stage1TaskType,
  Stage1UnlockableCropType,
  Stage1WorkerState,
} from "./types";

type Listener = (snapshot: Stage1Snapshot) => void;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function cloneState(state: Stage1PersistentState): Stage1PersistentState {
  return JSON.parse(JSON.stringify(state)) as Stage1PersistentState;
}

function createTaskId(taskType: Stage1TaskType, targetId: string) {
  return `${taskType}:${targetId}`;
}

export class Stage1Session {
  private static readonly MAX_OFFLINE_SECONDS = 5 * 60;
  private state: Stage1PersistentState;
  private listeners = new Set<Listener>();
  private pendingFeedback: Stage1CommandResult[] = [];

  constructor(initialState?: Stage1PersistentState) {
    const loadedSave = initialState ? null : loadStage1SaveData();
    this.state = cloneState(loadedSave?.state ?? initialState ?? loadStage1State());
    this.ensureRecoverableState();
    this.refreshTasks();
    if (loadedSave?.updatedAt) {
      this.applyOfflineProgress(loadedSave.updatedAt);
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getState() {
    return this.state;
  }

  getSnapshot(): Stage1Snapshot {
    return {
      state: cloneState(this.state),
      nextLevelAt: getNextLevelExperience(this.state.level),
    };
  }

  consumePendingFeedback() {
    return this.pendingFeedback.shift() ?? null;
  }

  setActiveLocation(location: "MEADOW" | "GARDEN"): Stage1CommandResult {
    this.state.activeLocation = location;
    this.persistAndEmit();
    return {
      ok: true,
      message: location === "GARDEN" ? "Макс идет к грядкам." : "Макс вернулся на луг.",
      tone: "info",
    };
  }

  tick(deltaSeconds: number) {
    if (deltaSeconds <= 0) {
      return;
    }

    this.advanceSimulation(deltaSeconds);
    const rescued = this.ensureRecoverableState();
    if (rescued) {
      this.save();
    }
    this.emit();
  }

  save() {
    persistStage1State(this.state);
  }

  resetToDefaults() {
    this.state = createDefaultStage1State();
    this.pendingFeedback = [];
    this.ensureRecoverableState();
    this.refreshTasks();
    this.save();
    this.emit();
  }

  private advanceSimulation(deltaSeconds: number) {
    const hungerUpgrade = this.getHungerMultiplier();

    this.state.animals = this.state.animals.map((animal) => {
      const def = STAGE1_ANIMAL_DEFS[animal.species];
      const next = { ...animal };
      next.hunger = clamp(next.hunger + (100 / def.hungerDurationSec) * deltaSeconds * hungerUpgrade, 0, 100);
      next.mood = next.hunger >= 75 ? "hungry" : "happy";

      if (next.hunger < 75 && !next.hasProduct) {
        next.productionProgress = clamp(next.productionProgress + deltaSeconds / def.productionDurationSec, 0, 1);
        if (next.productionProgress >= 1) {
          next.hasProduct = true;
        }
      }

      next.happiness = clamp(next.happiness - deltaSeconds * (next.hunger >= 75 ? 1.2 : 0.18), 15, 100);
      return next;
    });

    for (const penId of STAGE1_PEN_ORDER) {
      const pen = this.state.pens[penId];
      if (!pen?.isOwned) {
        continue;
      }
      const animalCount = this.state.animals.filter((animal) => animal.penId === penId).length;
      if (animalCount <= 0) {
        pen.cleanliness = clamp(pen.cleanliness + deltaSeconds * 0.6, 0, 100);
      } else {
        pen.cleanliness = clamp(pen.cleanliness - deltaSeconds * (0.45 + animalCount * 0.12), 0, 100);
      }
    }

    for (const plot of Object.values(this.state.crops)) {
      if (!plot.cropType || !plot.watered || plot.growth >= 1) {
        continue;
      }

      const cropDef = STAGE1_CROP_DEFS[plot.cropType];
      plot.growth = clamp(plot.growth + deltaSeconds / cropDef.growTime, 0, 1);
    }

    this.refreshTasks();
  }

  getAnimalDefinition(species: Stage1AnimalSpecies): Stage1AnimalDefinition {
    return STAGE1_ANIMAL_DEFS[species];
  }

  getOwnedBirdPens() {
    return STAGE1_PEN_ORDER
      .filter((penId) => this.state.pens[penId]?.isOwned)
      .map((penId) => ({
        definition: STAGE1_BIRD_PENS[penId],
        state: this.state.pens[penId],
        occupancy: this.getPenOccupancy(penId),
      }));
  }

  getBirdCatalog() {
    return (Object.keys(STAGE1_ANIMAL_DEFS) as Stage1AnimalSpecies[]).map((species) => STAGE1_ANIMAL_DEFS[species]);
  }

  getAnimalProductCount(species: Stage1AnimalSpecies) {
    return this.state.inventory[STAGE1_ANIMAL_DEFS[species].productKey] ?? 0;
  }

  buyAnimal(species: Stage1AnimalSpecies = STAGE1_STARTING_BIRD_SPECIES): Stage1CommandResult {
    const definition = STAGE1_ANIMAL_DEFS[species];
    const penId = this.findFreeBirdPenSlot();
    if (!penId) {
      return { ok: false, message: "Сначала нужен свободный загон.", tone: "warn" };
    }

    if (this.state.coins < definition.cost) {
      return { ok: false, message: "Не хватает монет.", tone: "warn" };
    }

    this.state.coins -= definition.cost;
    const index = this.state.animals.length + 1;
    const x = this.getNextSpawnXInPen(penId);
    this.state.animals.push(createDefaultAnimal(
      `stage1-bird-${index}`,
      species,
      index === 1 ? "Цыпа" : `${definition.nameRu} ${index}`,
      x,
      penId,
    ));

    this.refreshTasks();
    this.persistAndEmit();
    return { ok: true, message: `${definition.nameRu} теперь живет на ферме.`, tone: "success" };
  }

  buyPen(penId: string): Stage1CommandResult {
    const pen = this.state.pens[penId];
    const definition = STAGE1_BIRD_PENS[penId];
    if (!pen || !definition) {
      return { ok: false, message: "Загон не найден.", tone: "warn" };
    }
    if (pen.isOwned) {
      return { ok: false, message: "Этот загон уже открыт.", tone: "warn" };
    }
    if (this.state.coins < definition.cost) {
      return { ok: false, message: "Не хватает монет.", tone: "warn" };
    }

    this.state.coins -= definition.cost;
    pen.isOwned = true;
    pen.cleanliness = 100;
    this.grantExperience(STAGE1_BUY_PEN_XP);
    this.persistAndEmit();
    return { ok: true, message: `${definition.nameRu} готов.`, tone: "success" };
  }

  feedAnimal(animalId: string, actor: "player" | "worker"): Stage1CommandResult {
    const animal = this.state.animals.find((entry) => entry.id === animalId);
    if (!animal) {
      return { ok: false, message: "Птичка пропала.", tone: "warn" };
    }

    const def = STAGE1_ANIMAL_DEFS[animal.species];
    const availableFood = this.state.inventory[def.foodType] ?? 0;
    if (availableFood <= 0) {
      return { ok: false, message: "Нужен корм.", tone: "warn" };
    }

    this.state.inventory[def.foodType] = availableFood - 1;
    animal.hunger = 0;
    animal.mood = "happy";
    animal.happiness = clamp(animal.happiness + 18, 0, 100);
    this.removeTask("feed-animal", animalId);
    this.clearWorkerReservation(animalId);
    this.grantExperience(STAGE1_FEED_XP);
    this.refreshTasks();
    this.persistAndEmit();

    return {
      ok: true,
      message: actor === "worker" ? `Мама покормила ${animal.name}.` : `${animal.name} поел.`,
      tone: "success",
    };
  }

  collectProduct(animalId: string): Stage1CommandResult {
    const animal = this.state.animals.find((entry) => entry.id === animalId);
    if (!animal || !animal.hasProduct) {
      return { ok: false, message: "Пока пусто.", tone: "warn" };
    }

    const def = STAGE1_ANIMAL_DEFS[animal.species];
    animal.hasProduct = false;
    animal.productionProgress = 0;
    this.state.inventory[def.productKey] = (this.state.inventory[def.productKey] ?? 0) + 1;
    this.state.coins += def.productPrice;
    this.removeTask("collect-product", animalId);
    this.clearWorkerReservation(animalId);
    this.grantExperience(STAGE1_FEED_XP + 7);
    this.refreshTasks();
    this.persistAndEmit();
    return { ok: true, message: `Собрано: ${def.productNameRu}.`, tone: "success" };
  }

  cleanPen(penId: string, actor: "player" | "worker"): Stage1CommandResult {
    const pen = this.state.pens[penId];
    if (!pen?.isOwned) {
      return { ok: false, message: "Этот загон закрыт.", tone: "warn" };
    }
    if (pen.cleanliness >= 90) {
      return { ok: false, message: "Тут уже чисто.", tone: "info" };
    }

    pen.cleanliness = 100;
    this.removeTask("clean-pen", penId);
    this.clearWorkerReservation(penId);
    this.grantExperience(STAGE1_CLEAN_PEN_XP);
    this.refreshTasks();
    this.persistAndEmit();
    return {
      ok: true,
      message: actor === "worker" ? "Мама прибрала загон." : "Загон снова чистый.",
      tone: "success",
    };
  }

  buyUpgrade(): Stage1CommandResult {
    const upgrade = this.state.upgrades[STAGE1_UPGRADE.id];
    if (upgrade.level >= STAGE1_UPGRADE.maxLevel) {
      return { ok: false, message: "Суперкорм уже открыт.", tone: "warn" };
    }

    if (this.state.coins < STAGE1_UPGRADE.cost) {
      return { ok: false, message: "Не хватает монет.", tone: "warn" };
    }

    this.state.coins -= STAGE1_UPGRADE.cost;
    upgrade.level += 1;
    this.persistAndEmit();
    return { ok: true, message: "Суперкорм улучшен.", tone: "success" };
  }

  buyWheatUpgrade(): Stage1CommandResult {
    const upgrade = this.state.upgrades[STAGE1_WHEAT_UPGRADE.id];
    if (upgrade.level >= STAGE1_WHEAT_UPGRADE.maxLevel) {
      return { ok: false, message: "Пшеница уже улучшена.", tone: "warn" };
    }

    if (this.state.coins < STAGE1_WHEAT_UPGRADE.cost) {
      return { ok: false, message: "Не хватает монет.", tone: "warn" };
    }

    this.state.coins -= STAGE1_WHEAT_UPGRADE.cost;
    upgrade.level += 1;
    this.persistAndEmit();
    return { ok: true, message: "Урожай пшеницы вырос.", tone: "success" };
  }

  buyCropUnlock(cropType: Stage1UnlockableCropType): Stage1CommandResult {
    const unlock = STAGE1_CROP_UNLOCKS[cropType];
    const upgrade = this.state.upgrades[unlock.id];
    if ((upgrade?.level ?? 0) >= 1) {
      return { ok: false, message: `${STAGE1_CROP_DEFS[cropType].nameRu} уже открыта.`, tone: "warn" };
    }

    if (this.state.coins < unlock.cost) {
      return { ok: false, message: "Не хватает монет.", tone: "warn" };
    }

    this.state.coins -= unlock.cost;
    this.state.upgrades[unlock.id] = { id: unlock.id, level: 1 };
    this.persistAndEmit();
    return { ok: true, message: `${STAGE1_CROP_DEFS[cropType].nameRu} открыта.`, tone: "success" };
  }

  buySeeds(cropType: Stage1CropType): Stage1CommandResult {
    if (!this.isCropUnlocked(cropType)) {
      return { ok: false, message: "Сначала открой навык.", tone: "warn" };
    }

    const cropDef = STAGE1_CROP_DEFS[cropType];
    const seedKey = STAGE1_SEED_KEYS[cropType];
    if (this.state.coins < cropDef.seedCost) {
      return { ok: false, message: "Не хватает монет.", tone: "warn" };
    }

    this.state.coins -= cropDef.seedCost;
    this.state.inventory[seedKey] = (this.state.inventory[seedKey] ?? 0) + 2;
    this.persistAndEmit();
    return { ok: true, message: `Куплены семена: ${cropDef.nameRu}.`, tone: "success" };
  }

  plantCrop(plotId: string, cropType: Stage1CropType): Stage1CommandResult {
    const plot = this.state.crops[plotId];
    if (!plot) {
      return { ok: false, message: "Грядка не найдена.", tone: "warn" };
    }

    if (!this.isPlotUnlocked(plotId)) {
      return { ok: false, message: "Эта грядка откроется позже.", tone: "warn" };
    }

    if (plot.cropType) {
      return { ok: false, message: "Здесь уже что-то растет.", tone: "warn" };
    }

    if (!this.isCropUnlocked(cropType)) {
      return { ok: false, message: "Сначала открой навык.", tone: "warn" };
    }

    const seedKey = STAGE1_SEED_KEYS[cropType];
    if ((this.state.inventory[seedKey] ?? 0) <= 0) {
      return { ok: false, message: "Нет семян.", tone: "warn" };
    }

    this.state.inventory[seedKey] -= 1;
    plot.cropType = cropType;
    plot.growth = 0;
    plot.watered = false;
    this.persistAndEmit();
    return { ok: true, message: `Посажено: ${STAGE1_CROP_DEFS[cropType].nameRu}.`, tone: "success" };
  }

  waterCrop(plotId: string): Stage1CommandResult {
    const plot = this.state.crops[plotId];
    if (!plot || !plot.cropType) {
      return { ok: false, message: "Тут пока пусто.", tone: "warn" };
    }

    if (plot.growth >= 1) {
      return { ok: false, message: "Уже готово.", tone: "info" };
    }

    if (plot.watered) {
      return { ok: false, message: "Уже полито.", tone: "info" };
    }

    plot.watered = true;
    this.persistAndEmit();
    return { ok: true, message: "Грядка полита.", tone: "success" };
  }

  harvestCrop(plotId: string): Stage1CommandResult {
    const plot = this.state.crops[plotId];
    if (!plot || !plot.cropType) {
      return { ok: false, message: "Тут нечего собирать.", tone: "warn" };
    }

    if (plot.growth < 1) {
      return { ok: false, message: "Еще рано.", tone: "warn" };
    }

    const cropDef = STAGE1_CROP_DEFS[plot.cropType];
    const yieldCount = cropDef.yieldCount + (plot.cropType === "WHEAT" ? this.getWheatYieldBonus() : 0);
    this.state.inventory[plot.cropType] = (this.state.inventory[plot.cropType] ?? 0) + yieldCount;
    this.state.coins += cropDef.sellPrice * yieldCount;
    this.grantExperience(STAGE1_HARVEST_XP);
    plot.cropType = null;
    plot.growth = 0;
    plot.watered = false;
    this.persistAndEmit();
    return { ok: true, message: `Собрано: ${cropDef.nameRu}.`, tone: "success" };
  }

  interactWithGardenPlot(plotId: string): Stage1CommandResult {
    const plot = this.state.crops[plotId];
    if (!plot) {
      return { ok: false, message: "Грядка не найдена.", tone: "warn" };
    }

    if (!this.isPlotUnlocked(plotId)) {
      return { ok: false, message: "Эта грядка откроется позже.", tone: "warn" };
    }

    if (!plot.cropType) {
      return this.plantCrop(plotId, "WHEAT");
    }

    if (plot.growth >= 1) {
      return this.harvestCrop(plotId);
    }

    if (!plot.watered) {
      return this.waterCrop(plotId);
    }

    return { ok: false, message: "Подожди немного.", tone: "info" };
  }

  toggleWorkerActive(): Stage1CommandResult {
    const worker = this.state.workers[STAGE1_WORKER_TEMPLATE.id];
    worker.isActive = !worker.isActive;
    this.persistAndEmit();
    return {
      ok: true,
      message: worker.isActive ? "Мама работает." : "Мама отдыхает.",
      tone: "info",
    };
  }

  reserveTaskForWorker(workerId: string) {
    const task = this.state.tasks
      .filter((entry) => !entry.reservedByWorkerId)
      .sort((a, b) => b.priority - a.priority)[0];
    if (!task) {
      return null;
    }
    task.reservedByWorkerId = workerId;
    return { ...task };
  }

  releaseTask(taskId: string, workerId: string) {
    const task = this.state.tasks.find((entry) => entry.id === taskId);
    if (task?.reservedByWorkerId === workerId) {
      delete task.reservedByWorkerId;
    }
  }

  completeReservedTask(taskId: string, workerId: string) {
    const task = this.state.tasks.find((entry) => entry.id === taskId && entry.reservedByWorkerId === workerId);
    if (!task) {
      return { ok: false, message: "Задание пропало.", tone: "warn" } as Stage1CommandResult;
    }

    if (task.type === "feed-animal") {
      return this.feedAnimal(task.targetId, "worker");
    }
    if (task.type === "collect-product") {
      return this.collectProduct(task.targetId);
    }
    return this.cleanPen(task.targetId, "worker");
  }

  getTaskTargetX(task: Pick<Stage1TaskState, "type" | "targetId">) {
    if (task.type === "clean-pen") {
      return STAGE1_BIRD_PENS[task.targetId]?.centerX ?? STAGE1_BIRD_PENS["bird-pen-1"].centerX;
    }
    const animal = this.state.animals.find((entry) => entry.id === task.targetId);
    return animal?.position.x ?? STAGE1_BIRD_PENS["bird-pen-1"].centerX;
  }

  getHungryAnimal(): Stage1AnimalState | undefined {
    return this.state.animals.find((animal) => animal.hunger >= 75);
  }

  getWorker(): Stage1WorkerState {
    return this.state.workers[STAGE1_WORKER_TEMPLATE.id];
  }

  isCropUnlocked(cropType: Stage1CropType) {
    if (cropType === "WHEAT") {
      return true;
    }

    const unlock = STAGE1_CROP_UNLOCKS[cropType];
    return (this.state.upgrades[unlock.id]?.level ?? 0) > 0;
  }

  isPlotUnlocked(plotId: string) {
    return this.state.unlockedPlots.includes(plotId);
  }

  canInteractAtDistance(playerX: number, targetX: number) {
    return Math.abs(playerX - targetX) <= STAGE1_INTERACTION_RANGE;
  }

  getPenOccupancy(penId: string) {
    return this.state.animals.filter((animal) => animal.penId === penId).length;
  }

  getPenCapacity(penId: string) {
    return STAGE1_BIRD_PENS[penId]?.capacity ?? 0;
  }

  isPenOwned(penId: string) {
    return Boolean(this.state.pens[penId]?.isOwned);
  }

  private getHungerMultiplier() {
    const upgradeLevel = this.state.upgrades[STAGE1_UPGRADE.id]?.level ?? 0;
    return upgradeLevel > 0 ? STAGE1_UPGRADE.hungerDecayMultiplier ?? 1 : 1;
  }

  private getWheatYieldBonus() {
    const level = this.state.upgrades[STAGE1_WHEAT_UPGRADE.id]?.level ?? 0;
    return level > 0 ? STAGE1_WHEAT_UPGRADE.yieldBonus ?? 0 : 0;
  }

  private grantExperience(amount: number) {
    this.state.experience += amount;
    while (this.state.experience >= getNextLevelExperience(this.state.level)) {
      this.state.experience -= getNextLevelExperience(this.state.level);
      this.state.level += 1;
      this.state.coins += 25;
    }
  }

  private findFreeBirdPenSlot() {
    for (const penId of STAGE1_PEN_ORDER) {
      if (!this.state.pens[penId]?.isOwned) {
        continue;
      }
      if (this.getPenOccupancy(penId) < this.getPenCapacity(penId)) {
        return penId;
      }
    }
    return null;
  }

  private getNextSpawnXInPen(penId: string) {
    const pen = STAGE1_BIRD_PENS[penId];
    const current = this.state.animals.filter((animal) => animal.penId === penId).length;
    return clamp(pen.minX + 84 + current * 92, pen.minX + 42, pen.maxX - 42);
  }

  private refreshTasks() {
    const nextTasks = new Map<string, Stage1TaskState>();
    for (const animal of this.state.animals) {
      if (animal.hunger >= 75) {
        const id = createTaskId("feed-animal", animal.id);
        nextTasks.set(id, {
          id,
          type: "feed-animal",
          targetId: animal.id,
          penId: animal.penId,
          priority: 3,
          reservedByWorkerId: this.getExistingReservation(id),
        });
      }
      if (animal.hasProduct) {
        const id = createTaskId("collect-product", animal.id);
        nextTasks.set(id, {
          id,
          type: "collect-product",
          targetId: animal.id,
          penId: animal.penId,
          priority: 2,
          reservedByWorkerId: this.getExistingReservation(id),
        });
      }
    }

    for (const penId of STAGE1_PEN_ORDER) {
      if (!this.state.pens[penId]?.isOwned) {
        continue;
      }
      if ((this.state.pens[penId]?.cleanliness ?? 100) < 46) {
        const id = createTaskId("clean-pen", penId);
        nextTasks.set(id, {
          id,
          type: "clean-pen",
          targetId: penId,
          penId,
          priority: 1,
          reservedByWorkerId: this.getExistingReservation(id),
        });
      }
    }

    this.state.tasks = Array.from(nextTasks.values());
  }

  private getExistingReservation(taskId: string) {
    return this.state.tasks.find((task) => task.id === taskId)?.reservedByWorkerId;
  }

  private removeTask(type: Stage1TaskType, targetId: string) {
    const taskId = createTaskId(type, targetId);
    this.state.tasks = this.state.tasks.filter((task) => task.id !== taskId);
  }

  private clearWorkerReservation(targetId: string) {
    for (const task of this.state.tasks) {
      if (task.targetId === targetId) {
        delete task.reservedByWorkerId;
      }
    }
  }

  private hasFreeRecoveryAction() {
    const hasSeeds = Object.values(STAGE1_SEED_KEYS).some((seedKey) => (this.state.inventory[seedKey] ?? 0) > 0);
    const hasReadyCrop = Object.values(this.state.crops).some((plot) => plot.cropType && plot.growth >= 1);
    const hasGrowingCrop = Object.values(this.state.crops).some((plot) => plot.cropType && (plot.growth > 0 || plot.watered));
    const hasUnwateredCrop = Object.values(this.state.crops).some((plot) => plot.cropType && !plot.watered);
    const hasProductReady = this.state.animals.some((animal) => animal.hasProduct);
    const hasFeed = this.state.animals.some((animal) => (this.state.inventory[STAGE1_ANIMAL_DEFS[animal.species].foodType] ?? 0) > 0);
    const animalWillProduceSoon = this.state.animals.some((animal) => animal.hunger < 75 && !animal.hasProduct);

    return hasSeeds || hasReadyCrop || hasGrowingCrop || hasUnwateredCrop || hasProductReady || hasFeed || animalWillProduceSoon;
  }

  private ensureRecoverableState() {
    if (this.state.starterRescueUsed) {
      return false;
    }

    if (this.state.coins > 0) {
      return false;
    }

    const allSeedsEmpty = Object.values(STAGE1_SEED_KEYS).every((seedKey) => (this.state.inventory[seedKey] ?? 0) <= 0);
    if (!allSeedsEmpty) {
      return false;
    }

    if (this.hasFreeRecoveryAction()) {
      return false;
    }

    this.state.inventory[STAGE1_SEED_KEYS.WHEAT] = (this.state.inventory[STAGE1_SEED_KEYS.WHEAT] ?? 0) + STAGE1_RESCUE_SEED_GRANT;
    this.state.starterRescueUsed = true;
    this.pendingFeedback.push({
      ok: true,
      message: "Мама нашла семена!",
      tone: "success",
    });
    return true;
  }

  private persistAndEmit() {
    this.ensureRecoverableState();
    this.refreshTasks();
    this.save();
    this.emit();
  }

  private applyOfflineProgress(updatedAt: string) {
    const updatedMs = Date.parse(updatedAt);
    if (!Number.isFinite(updatedMs)) {
      return;
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - updatedMs) / 1000));
    if (elapsedSeconds < 5) {
      return;
    }

    const simulatedSeconds = Math.min(elapsedSeconds, Stage1Session.MAX_OFFLINE_SECONDS);
    this.advanceSimulation(simulatedSeconds);
    this.pendingFeedback.push({
      ok: true,
      message: simulatedSeconds >= 60 ? "Ферма ждала тебя." : "Пока тебя не было, ферма жила.",
      tone: "info",
    });
    this.save();
  }

  private emit() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

export const stage1Session = new Stage1Session();
