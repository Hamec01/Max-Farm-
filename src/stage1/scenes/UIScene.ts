import Phaser from "phaser";
import {
  STAGE1_ANIMAL_DEFS,
  STAGE1_BIRD_PENS,
  STAGE1_CROP_DEFS,
  STAGE1_CROP_UNLOCKS,
  STAGE1_INVENTORY_FOOD_KEY,
  STAGE1_SEED_KEYS,
  STAGE1_UPGRADE,
  STAGE1_WHEAT_UPGRADE,
  STAGE1_WORKER_TEMPLATE,
} from "../content";
import { stage1Events } from "../events";
import { stage1Session } from "../session";
import type { Stage1AnimalSpecies, Stage1CropType, Stage1PromptTone, Stage1Snapshot } from "../types";

type ShopTab = "bag" | "animals" | "workers" | "skills";
type ButtonTone = "green" | "gold" | "blue" | "cream" | "rose";

interface ActionButtonConfig {
  icon: string;
  label: string;
  tone?: ButtonTone;
  disabled?: boolean;
  action?: () => void;
}

interface CardConfig {
  title: string;
  icon: string;
  badge?: string;
  note?: string;
  price?: string;
  action?: ActionButtonConfig;
  compact?: boolean;
}

export class UIScene extends Phaser.Scene {
  private overlayRoot!: HTMLDivElement;
  private topBar!: HTMLDivElement;
  private hudRoot!: HTMLDivElement;
  private hudStats!: HTMLDivElement;
  private promptBox!: HTMLDivElement;
  private toastBox!: HTMLDivElement;
  private modalBackdrop!: HTMLDivElement;
  private shopWindow!: HTMLDivElement;
  private shopTabs!: HTMLDivElement;
  private shopBody!: HTMLDivElement;
  private plotWindow!: HTMLDivElement;
  private plotTitle!: HTMLDivElement;
  private plotBody!: HTMLDivElement;
  private penWindow!: HTMLDivElement;
  private penTitle!: HTMLDivElement;
  private penBody!: HTMLDivElement;
  leftButton!: Phaser.GameObjects.Arc;
  rightButton!: Phaser.GameObjects.Arc;
  private mobileControlVisuals: Phaser.GameObjects.GameObject[] = [];
  private shopOpen = false;
  private currentShopTab: ShopTab = "bag";
  selectedPlotId: string | null = null;
  selectedPenId: string | null = null;
  private currentSnapshot = stage1Session.getSnapshot();
  private shopRenderKey = "";
  private plotRenderKey = "";
  private penRenderKey = "";
  private toastTimer?: Phaser.Time.TimerEvent;
  private unsubscribeSession?: () => void;

  constructor() {
    super("UIScene");
  }

  create() {
    this.createDomOverlay();
    this.createMovementControls();
    this.bindEvents();
    this.refreshHud(this.currentSnapshot);
  }

  toggleShop(force?: boolean) {
    this.shopOpen = typeof force === "boolean" ? force : !this.shopOpen;
    if (this.shopOpen) {
      this.closePlotPanel();
      this.closePenPanel();
    }
    this.renderShop();
    this.syncOverlayState();
    stage1Events.emit("shop:toggled", this.shopOpen);
  }

  openShopTab(tab: ShopTab) {
    this.currentShopTab = tab;
    this.toggleShop(true);
  }

  getShopBounds() {
    return this.shopWindow.getBoundingClientRect();
  }

  public openPlotPanel(plotId: string) {
    this.selectedPlotId = plotId;
    this.selectedPenId = null;
    this.shopOpen = false;
    this.renderShop();
    this.renderPlotPanel();
    this.syncOverlayState();
  }

  public closePlotPanel() {
    this.selectedPlotId = null;
    this.renderPlotPanel();
    this.syncOverlayState();
  }

  public openPenPanel(penId: string) {
    this.selectedPenId = penId;
    this.selectedPlotId = null;
    this.shopOpen = false;
    this.renderShop();
    this.renderPenPanel();
    this.syncOverlayState();
  }

  public closePenPanel() {
    this.selectedPenId = null;
    this.renderPenPanel();
    this.syncOverlayState();
  }

  private createDomOverlay() {
    const shell = document.getElementById("stage1-shell");
    if (!shell) {
      throw new Error("Stage 1 shell not found for UI overlay.");
    }

    this.overlayRoot = document.createElement("div");
    this.overlayRoot.className = "stage1-ui";
    this.overlayRoot.innerHTML = `
      <div class="stage1-ui__chrome">
        <div class="stage1-topbar"></div>
        <div class="stage1-hud">
          <div class="stage1-hud__title">Max Farm</div>
          <div class="stage1-hud__stats"></div>
        </div>
        <div class="stage1-toast" data-tone="info"></div>
        <div class="stage1-prompt"></div>
      </div>
      <div class="stage1-ui__modal-layer">
        <div class="stage1-modal-backdrop"></div>
        <section class="stage1-window stage1-window--shop" data-open="false">
          <header class="stage1-window__header">
            <div>
              <div class="stage1-window__eyebrow">МЕНЮ</div>
              <h2 class="stage1-window__title">Магазин</h2>
            </div>
            <button class="stage1-icon-button" data-stage1-close="shop" aria-label="Закрыть">${this.getIcon("close")}</button>
          </header>
          <div class="stage1-tabs"></div>
          <div class="stage1-window__body"></div>
        </section>
        <section class="stage1-window stage1-window--plot" data-open="false">
          <header class="stage1-window__header">
            <div>
              <div class="stage1-window__eyebrow">ГРЯДКА</div>
              <h2 class="stage1-window__title">Грядка</h2>
            </div>
            <button class="stage1-icon-button" data-stage1-close="plot" aria-label="Закрыть">${this.getIcon("close")}</button>
          </header>
          <div class="stage1-window__body"></div>
        </section>
        <section class="stage1-window stage1-window--pen" data-open="false">
          <header class="stage1-window__header">
            <div>
              <div class="stage1-window__eyebrow">ЗАГОН</div>
              <h2 class="stage1-window__title">Птичник</h2>
            </div>
            <button class="stage1-icon-button" data-stage1-close="pen" aria-label="Закрыть">${this.getIcon("close")}</button>
          </header>
          <div class="stage1-window__body"></div>
        </section>
      </div>
    `;
    shell.appendChild(this.overlayRoot);

    this.topBar = this.overlayRoot.querySelector(".stage1-topbar") as HTMLDivElement;
    this.hudRoot = this.overlayRoot.querySelector(".stage1-hud") as HTMLDivElement;
    this.hudStats = this.overlayRoot.querySelector(".stage1-hud__stats") as HTMLDivElement;
    this.promptBox = this.overlayRoot.querySelector(".stage1-prompt") as HTMLDivElement;
    this.toastBox = this.overlayRoot.querySelector(".stage1-toast") as HTMLDivElement;
    this.modalBackdrop = this.overlayRoot.querySelector(".stage1-modal-backdrop") as HTMLDivElement;
    this.shopWindow = this.overlayRoot.querySelector(".stage1-window--shop") as HTMLDivElement;
    this.shopTabs = this.overlayRoot.querySelector(".stage1-tabs") as HTMLDivElement;
    this.shopBody = this.overlayRoot.querySelector(".stage1-window--shop .stage1-window__body") as HTMLDivElement;
    this.plotWindow = this.overlayRoot.querySelector(".stage1-window--plot") as HTMLDivElement;
    this.plotTitle = this.overlayRoot.querySelector(".stage1-window--plot .stage1-window__title") as HTMLDivElement;
    this.plotBody = this.overlayRoot.querySelector(".stage1-window--plot .stage1-window__body") as HTMLDivElement;
    this.penWindow = this.overlayRoot.querySelector(".stage1-window--pen") as HTMLDivElement;
    this.penTitle = this.overlayRoot.querySelector(".stage1-window--pen .stage1-window__title") as HTMLDivElement;
    this.penBody = this.overlayRoot.querySelector(".stage1-window--pen .stage1-window__body") as HTMLDivElement;

    this.modalBackdrop.addEventListener("click", () => {
      if (this.shopOpen) {
        this.toggleShop(false);
      }
      this.closePlotPanel();
      this.closePenPanel();
    });

    this.overlayRoot.querySelector('[data-stage1-close="shop"]')?.addEventListener("click", () => this.toggleShop(false));
    this.overlayRoot.querySelector('[data-stage1-close="plot"]')?.addEventListener("click", () => this.closePlotPanel());
    this.overlayRoot.querySelector('[data-stage1-close="pen"]')?.addEventListener("click", () => this.closePenPanel());

    this.renderTopBar();
    this.renderShop();
    this.syncOverlayState();
  }

  private createMovementControls() {
    this.leftButton = this.makeCircleButton(86, this.scale.height - 92, "<");
    this.rightButton = this.makeCircleButton(188, this.scale.height - 92, ">");

    const startHold = (direction: "left" | "right") => stage1Events.emit("control:hold", direction, true);
    const stopHold = (direction: "left" | "right") => stage1Events.emit("control:hold", direction, false);

    this.leftButton.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      startHold("left");
    });
    this.leftButton.on("pointerup", () => stopHold("left"));
    this.leftButton.on("pointerout", () => stopHold("left"));
    this.leftButton.on("pointerupoutside", () => stopHold("left"));

    this.rightButton.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      startHold("right");
    });
    this.rightButton.on("pointerup", () => stopHold("right"));
    this.rightButton.on("pointerout", () => stopHold("right"));
    this.rightButton.on("pointerupoutside", () => stopHold("right"));
  }

  private bindEvents() {
    this.scale.on("resize", this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize, this);
      this.overlayRoot.remove();
      this.mobileControlVisuals = [];
      this.unsubscribeSession?.();
    });

    this.unsubscribeSession = stage1Session.subscribe((snapshot) => {
      this.currentSnapshot = snapshot;
      this.refreshHud(snapshot);
      this.flushFeedbackQueue();
    });

    stage1Events.on("prompt:update", this.handlePromptUpdate, this);
    stage1Events.on("feedback:show", this.showToast, this);
    stage1Events.on("plot:open", this.openPlotPanel, this);
    stage1Events.on("plot:close", this.closePlotPanel, this);
    stage1Events.on("pen:open", this.openPenPanel, this);
    stage1Events.on("pen:close", this.closePenPanel, this);
    stage1Events.on("shop:open-tab", this.openShopTab, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stage1Events.off("prompt:update", this.handlePromptUpdate, this);
      stage1Events.off("feedback:show", this.showToast, this);
      stage1Events.off("plot:open", this.openPlotPanel, this);
      stage1Events.off("plot:close", this.closePlotPanel, this);
      stage1Events.off("pen:open", this.openPenPanel, this);
      stage1Events.off("pen:close", this.closePenPanel, this);
      stage1Events.off("shop:open-tab", this.openShopTab, this);
    });
  }

  private flushFeedbackQueue() {
    let feedback = stage1Session.consumePendingFeedback();
    while (feedback) {
      this.showToast(feedback.message, feedback.tone);
      feedback = stage1Session.consumePendingFeedback();
    }
  }

  private refreshHud(snapshot: Stage1Snapshot) {
    const food = snapshot.state.inventory[STAGE1_INVENTORY_FOOD_KEY] ?? 0;
    const products = Object.values(STAGE1_ANIMAL_DEFS).reduce((sum, animal) => sum + (snapshot.state.inventory[animal.productKey] ?? 0), 0);
    const wheatSeeds = snapshot.state.inventory[STAGE1_SEED_KEYS.WHEAT] ?? 0;

    this.hudStats.innerHTML = "";
    this.hudStats.append(
      this.createStatChip("coin", `${snapshot.state.coins}`),
      this.createStatChip("seed", `${wheatSeeds}`),
      this.createStatChip("wheat", `${food}`),
      this.createStatChip("egg", `${products}`),
      this.createStatChip("xp", `${snapshot.state.level}`),
    );

    this.topBar.querySelector('[data-stage1-action="goto-meadow"]')?.toggleAttribute("data-active", snapshot.state.activeLocation === "MEADOW");
    this.topBar.querySelector('[data-stage1-action="goto-garden"]')?.toggleAttribute("data-active", snapshot.state.activeLocation === "GARDEN");

    if (snapshot.state.activeLocation !== "GARDEN" && this.selectedPlotId) {
      this.closePlotPanel();
    }

    if (snapshot.state.activeLocation !== "MEADOW" && this.selectedPenId) {
      this.closePenPanel();
    }

    this.renderShopIfNeeded();
    this.renderPlotPanelIfNeeded();
    this.renderPenPanelIfNeeded();
    this.syncOverlayState();
  }

  private handlePromptUpdate(text: string) {
    this.promptBox.textContent = text;
  }

  private showToast(message: string, tone: Stage1PromptTone = "info") {
    this.toastBox.dataset.tone = tone;
    this.toastBox.textContent = message;
    this.toastBox.dataset.visible = "true";
    this.toastTimer?.remove(false);
    this.toastTimer = this.time.delayedCall(1900, () => {
      this.toastBox.dataset.visible = "false";
    });
  }

  private renderTopBar() {
    this.topBar.innerHTML = "";
    this.topBar.append(
      this.createNavButton("goto-meadow", { icon: "meadow", label: "Луг", tone: "green", action: () => this.goToLocation("MEADOW") }),
      this.createNavButton("goto-garden", { icon: "garden", label: "Грядки", tone: "green", action: () => this.goToLocation("GARDEN") }),
      this.createNavButton("toggle-shop", { icon: "shop", label: "Магазин", tone: "gold", action: () => this.toggleShop() }),
    );
  }

  private renderShop() {
    this.shopWindow.dataset.open = String(this.shopOpen);
    if (!this.shopOpen) {
      return;
    }
    this.shopRenderKey = this.getShopRenderKey();

    this.shopTabs.innerHTML = "";
    const tabs: Array<{ id: ShopTab; icon: string; label: string }> = [
      { id: "bag", icon: "bag", label: "Сумка" },
      { id: "animals", icon: "chick", label: "Птицы" },
      { id: "workers", icon: "worker", label: "Мама" },
      { id: "skills", icon: "spark", label: "Навыки" },
    ];

    for (const tab of tabs) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "stage1-tab";
      button.dataset.active = String(this.currentShopTab === tab.id);
      button.innerHTML = `${this.getIcon(tab.icon)}<span>${tab.label}</span>`;
      button.addEventListener("click", () => {
        this.currentShopTab = tab.id;
        this.renderShop();
      });
      this.shopTabs.appendChild(button);
    }

    this.shopBody.innerHTML = "";
    if (this.currentShopTab === "bag") {
      this.renderBagTab();
      return;
    }
    if (this.currentShopTab === "animals") {
      this.renderAnimalsTab();
      return;
    }
    if (this.currentShopTab === "workers") {
      this.renderWorkersTab();
      return;
    }
    this.renderSkillsTab();
  }

  private renderShopIfNeeded() {
    if (!this.shopOpen) {
      return;
    }
    const nextKey = this.getShopRenderKey();
    if (nextKey !== this.shopRenderKey) {
      this.renderShop();
    }
  }

  private renderBagTab() {
    const state = this.currentSnapshot.state;
    const cards: CardConfig[] = [
      {
        title: "Семена пшеницы",
        icon: "seed",
        badge: `x${state.inventory[STAGE1_SEED_KEYS.WHEAT] ?? 0}`,
        note: "2 шт",
        price: `${STAGE1_CROP_DEFS.WHEAT.seedCost}`,
        action: {
          icon: "coin",
          label: "Купить",
          tone: "green",
          action: () => this.showToastFrom(stage1Session.buySeeds("WHEAT")),
        },
      },
      {
        title: "Корм",
        icon: "wheat",
        badge: `x${state.inventory[STAGE1_INVENTORY_FOOD_KEY] ?? 0}`,
        note: "Для птиц",
      },
    ];

    for (const species of Object.keys(STAGE1_ANIMAL_DEFS) as Stage1AnimalSpecies[]) {
      const def = STAGE1_ANIMAL_DEFS[species];
      cards.push({
        title: def.productNameRu,
        icon: this.getAnimalIcon(species),
        badge: `x${state.inventory[def.productKey] ?? 0}`,
        note: "Склад",
        compact: true,
      });
    }

    const carrotUnlocked = stage1Session.isCropUnlocked("CARROT");
    cards.push({
      title: "Семена моркови",
      icon: "carrot",
      badge: carrotUnlocked ? `x${state.inventory[STAGE1_SEED_KEYS.CARROT] ?? 0}` : "Замок",
      note: carrotUnlocked ? "2 шт" : "Навык",
      price: `${STAGE1_CROP_DEFS.CARROT.seedCost}`,
      action: {
        icon: carrotUnlocked ? "coin" : "lock",
        label: carrotUnlocked ? "Купить" : "Закрыто",
        tone: carrotUnlocked ? "blue" : "cream",
        disabled: !carrotUnlocked,
        action: () => this.showToastFrom(stage1Session.buySeeds("CARROT")),
      },
    });

    const cloverUnlocked = stage1Session.isCropUnlocked("CLOVER");
    cards.push({
      title: "Семена клевера",
      icon: "clover",
      badge: cloverUnlocked ? `x${state.inventory[STAGE1_SEED_KEYS.CLOVER] ?? 0}` : "Замок",
      note: cloverUnlocked ? "2 шт" : "Навык",
      price: `${STAGE1_CROP_DEFS.CLOVER.seedCost}`,
      action: {
        icon: cloverUnlocked ? "coin" : "lock",
        label: cloverUnlocked ? "Купить" : "Закрыто",
        tone: cloverUnlocked ? "blue" : "cream",
        disabled: !cloverUnlocked,
        action: () => this.showToastFrom(stage1Session.buySeeds("CLOVER")),
      },
    });

    for (const card of cards) {
      this.shopBody.appendChild(this.createCard(card));
    }
  }

  private renderAnimalsTab() {
    const hasFreeSlot = stage1Session.getOwnedBirdPens().some((penInfo) => penInfo.occupancy < penInfo.definition.capacity);

    for (const penId of Object.keys(STAGE1_BIRD_PENS)) {
      const pen = STAGE1_BIRD_PENS[penId];
      const owned = stage1Session.isPenOwned(penId);
      const occupancy = stage1Session.getPenOccupancy(penId);
      this.shopBody.appendChild(this.createCard({
        title: pen.nameRu,
        icon: "pen",
        badge: owned ? `${occupancy}/${pen.capacity}` : "Замок",
        note: owned ? "Готов" : "Новый дом",
        price: owned ? undefined : `${pen.cost}`,
        action: owned
          ? {
            icon: "open",
            label: "Открыть",
            tone: "cream",
            action: () => {
              this.toggleShop(false);
              stage1Events.emit("pen:open", penId);
            },
          }
          : {
            icon: "coin",
            label: "Купить",
            tone: "blue",
            action: () => this.showToastFrom(stage1Session.buyPen(penId)),
          },
      }));
    }

    for (const species of Object.keys(STAGE1_ANIMAL_DEFS) as Stage1AnimalSpecies[]) {
      const def = STAGE1_ANIMAL_DEFS[species];
      const ownedCount = this.currentSnapshot.state.animals.filter((animal) => animal.species === species).length;
      this.shopBody.appendChild(this.createCard({
        title: def.nameRu,
        icon: this.getAnimalIcon(species),
        badge: `${ownedCount}`,
        note: def.productNameRu,
        price: `${def.cost}`,
        action: {
          icon: "coin",
          label: "Купить",
          tone: "gold",
          disabled: !hasFreeSlot,
          action: () => this.showToastFrom(stage1Session.buyAnimal(species)),
        },
      }));
    }
  }

  private renderWorkersTab() {
    const worker = this.currentSnapshot.state.workers[STAGE1_WORKER_TEMPLATE.id];
    this.shopBody.appendChild(this.createCard({
      title: "Мама",
      icon: "worker",
      badge: worker.isActive ? "ON" : "OFF",
      note: worker.isActive ? "Помогает" : "Спит",
      action: {
        icon: worker.isActive ? "pause" : "play",
        label: worker.isActive ? "Стоп" : "Пуск",
        tone: worker.isActive ? "rose" : "green",
        action: () => this.showToastFrom(stage1Session.toggleWorkerActive()),
      },
    }));

    this.shopBody.appendChild(this.createCard({
      title: "Новый помощник",
      icon: "lock",
      badge: "Скоро",
      note: "Позже",
      compact: true,
    }));
  }

  private renderSkillsTab() {
    const autoFeedLevel = this.currentSnapshot.state.upgrades[STAGE1_UPGRADE.id]?.level ?? 0;
    const wheatLevel = this.currentSnapshot.state.upgrades[STAGE1_WHEAT_UPGRADE.id]?.level ?? 0;
    const carrotOpened = stage1Session.isCropUnlocked("CARROT");
    const cloverOpened = stage1Session.isCropUnlocked("CLOVER");
    const cards: CardConfig[] = [
      {
        title: "Морковь",
        icon: "carrot",
        badge: carrotOpened ? "OK" : "Замок",
        note: "Новая грядка",
        price: `${STAGE1_CROP_UNLOCKS.CARROT.cost}`,
        action: {
          icon: carrotOpened ? "check" : "coin",
          label: carrotOpened ? "Есть" : "Открыть",
          tone: carrotOpened ? "cream" : "gold",
          disabled: carrotOpened,
          action: () => this.showToastFrom(stage1Session.buyCropUnlock("CARROT")),
        },
      },
      {
        title: "Клевер",
        icon: "clover",
        badge: cloverOpened ? "OK" : "Замок",
        note: "Новая грядка",
        price: `${STAGE1_CROP_UNLOCKS.CLOVER.cost}`,
        action: {
          icon: cloverOpened ? "check" : "coin",
          label: cloverOpened ? "Есть" : "Открыть",
          tone: cloverOpened ? "cream" : "gold",
          disabled: cloverOpened,
          action: () => this.showToastFrom(stage1Session.buyCropUnlock("CLOVER")),
        },
      },
      {
        title: "Пшеница +1",
        icon: "wheat",
        badge: `Ур. ${wheatLevel}`,
        note: "Больше сбора",
        price: `${STAGE1_WHEAT_UPGRADE.cost}`,
        action: {
          icon: wheatLevel > 0 ? "check" : "coin",
          label: wheatLevel > 0 ? "Есть" : "Купить",
          tone: wheatLevel > 0 ? "cream" : "green",
          disabled: wheatLevel >= STAGE1_WHEAT_UPGRADE.maxLevel,
          action: () => this.showToastFrom(stage1Session.buyWheatUpgrade()),
        },
      },
      {
        title: "Суперкорм",
        icon: "spark",
        badge: `Ур. ${autoFeedLevel}`,
        note: "Птицы сыты",
        price: `${STAGE1_UPGRADE.cost}`,
        action: {
          icon: autoFeedLevel > 0 ? "check" : "coin",
          label: autoFeedLevel > 0 ? "Есть" : "Купить",
          tone: autoFeedLevel > 0 ? "cream" : "blue",
          disabled: autoFeedLevel >= STAGE1_UPGRADE.maxLevel,
          action: () => this.showToastFrom(stage1Session.buyUpgrade()),
        },
      },
    ];

    for (const card of cards) {
      this.shopBody.appendChild(this.createCard(card));
    }
  }

  private renderPlotPanel() {
    const isOpen = Boolean(this.selectedPlotId);
    this.plotWindow.dataset.open = String(isOpen);
    if (!this.selectedPlotId) {
      this.plotRenderKey = "";
      return;
    }

    const plot = this.currentSnapshot.state.crops[this.selectedPlotId];
    if (!plot) {
      this.closePlotPanel();
      return;
    }

    const nextPlotKey = JSON.stringify({
      plotId: this.selectedPlotId,
      cropType: plot.cropType,
      growth: Math.round(plot.growth * 100),
      watered: plot.watered,
      wheatSeeds: this.currentSnapshot.state.inventory[STAGE1_SEED_KEYS.WHEAT] ?? 0,
      carrotSeeds: this.currentSnapshot.state.inventory[STAGE1_SEED_KEYS.CARROT] ?? 0,
      cloverSeeds: this.currentSnapshot.state.inventory[STAGE1_SEED_KEYS.CLOVER] ?? 0,
      carrotOpen: stage1Session.isCropUnlocked("CARROT"),
      cloverOpen: stage1Session.isCropUnlocked("CLOVER"),
    });
    this.plotRenderKey = nextPlotKey;

    this.plotTitle.textContent = `Грядка ${this.selectedPlotId.replace("plot", "#")}`;
    this.plotBody.innerHTML = "";

    if (!plot.cropType) {
      const wrap = document.createElement("div");
      wrap.className = "stage1-choice-grid";

      for (const cropType of ["WHEAT", "CARROT", "CLOVER"] as Stage1CropType[]) {
        const unlocked = stage1Session.isCropUnlocked(cropType);
        const seeds = this.currentSnapshot.state.inventory[STAGE1_SEED_KEYS[cropType]] ?? 0;
        const icon = cropType === "WHEAT" ? "wheat" : cropType === "CARROT" ? "carrot" : "clover";
        wrap.appendChild(this.createCard({
          title: STAGE1_CROP_DEFS[cropType].nameRu,
          icon,
          badge: unlocked ? `x${seeds}` : "Замок",
          note: unlocked ? "Посадить" : "Навык",
          compact: true,
          action: {
            icon: unlocked ? "seed" : "lock",
            label: unlocked ? "Сеять" : "Закрыто",
            tone: unlocked ? "gold" : "cream",
            disabled: !unlocked || seeds <= 0,
            action: () => {
              const result = stage1Session.plantCrop(this.selectedPlotId!, cropType);
              this.showToast(result.message, result.tone);
              if (result.ok) {
                this.closePlotPanel();
              }
            },
          },
        }));
      }

      this.plotBody.appendChild(wrap);
      return;
    }

    const growth = Math.round(plot.growth * 100);
    const icon = plot.cropType === "WHEAT" ? "wheat" : plot.cropType === "CARROT" ? "carrot" : "clover";
    const card = document.createElement("div");
    card.className = "stage1-plot-card";
    card.innerHTML = `
      <div class="stage1-plot-card__hero">
        <div class="stage1-plot-card__icon">${this.getIcon(icon)}</div>
        <div class="stage1-plot-card__meta">
          <div class="stage1-plot-card__name">${STAGE1_CROP_DEFS[plot.cropType].nameRu}</div>
          <div class="stage1-plot-card__state">${plot.growth >= 1 ? "Готово" : plot.watered ? "Растет" : "Нужна вода"}</div>
        </div>
      </div>
      <div class="stage1-progress">
        <div class="stage1-progress__fill" style="width:${growth}%"></div>
      </div>
      <div class="stage1-progress__label">${growth}%</div>
    `;
    this.plotBody.appendChild(card);

    if (plot.growth >= 1) {
      this.plotBody.appendChild(this.createActionButton({
        icon: "basket",
        label: "Собрать",
        tone: "green",
        action: () => {
          const result = stage1Session.harvestCrop(this.selectedPlotId!);
          this.showToast(result.message, result.tone);
          if (result.ok) {
            this.closePlotPanel();
          }
        },
      }));
      return;
    }

    if (!plot.watered) {
      this.plotBody.appendChild(this.createActionButton({
        icon: "drop",
        label: "Полить",
        tone: "blue",
        action: () => this.showToastFrom(stage1Session.waterCrop(this.selectedPlotId!)),
      }));
      return;
    }

    this.plotBody.appendChild(this.createMiniNote("Подожди"));
  }

  private renderPlotPanelIfNeeded() {
    if (!this.selectedPlotId) {
      return;
    }
    const plot = this.currentSnapshot.state.crops[this.selectedPlotId];
    if (!plot) {
      this.closePlotPanel();
      return;
    }
    const nextPlotKey = JSON.stringify({
      plotId: this.selectedPlotId,
      cropType: plot.cropType,
      growth: Math.round(plot.growth * 100),
      watered: plot.watered,
      wheatSeeds: this.currentSnapshot.state.inventory[STAGE1_SEED_KEYS.WHEAT] ?? 0,
      carrotSeeds: this.currentSnapshot.state.inventory[STAGE1_SEED_KEYS.CARROT] ?? 0,
      cloverSeeds: this.currentSnapshot.state.inventory[STAGE1_SEED_KEYS.CLOVER] ?? 0,
      carrotOpen: stage1Session.isCropUnlocked("CARROT"),
      cloverOpen: stage1Session.isCropUnlocked("CLOVER"),
    });
    if (nextPlotKey !== this.plotRenderKey) {
      this.renderPlotPanel();
    }
  }

  private renderPenPanel() {
    const isOpen = Boolean(this.selectedPenId);
    this.penWindow.dataset.open = String(isOpen);
    if (!this.selectedPenId) {
      this.penRenderKey = "";
      return;
    }

    const penDef = STAGE1_BIRD_PENS[this.selectedPenId];
    const penState = this.currentSnapshot.state.pens[this.selectedPenId];
    if (!penDef || !penState) {
      this.closePenPanel();
      return;
    }

    const birds = this.currentSnapshot.state.animals.filter((animal) => animal.penId === this.selectedPenId);
    const cleanliness = Math.round(penState.cleanliness);
    this.penRenderKey = JSON.stringify({
      penId: this.selectedPenId,
      coins: this.currentSnapshot.state.coins,
      owned: penState.isOwned,
      cleanliness,
      birds: birds.map((bird) => `${bird.id}:${bird.species}:${bird.hasProduct ? 1 : 0}:${Math.round(bird.hunger)}`),
    });

    this.penTitle.textContent = penDef.nameRu;
    this.penBody.innerHTML = "";

    if (!penState.isOwned) {
      this.penBody.appendChild(this.createCard({
        title: "Новый загон",
        icon: "pen",
        badge: `${penDef.capacity} мест`,
        note: "Для птиц",
        price: `${penDef.cost}`,
        action: {
          icon: "coin",
          label: "Купить",
          tone: "blue",
          action: () => this.showToastFrom(stage1Session.buyPen(this.selectedPenId!)),
        },
      }));
      return;
    }

    this.penBody.appendChild(this.createSummaryStrip([
      { icon: "chick", value: `${birds.length}/${penDef.capacity}` },
      { icon: "broom", value: `${cleanliness}%` },
    ]));

    const actions = document.createElement("div");
    actions.className = "stage1-action-row";
    actions.append(
      this.createActionButton({
        icon: "broom",
        label: "Убрать",
        tone: cleanliness < 90 ? "green" : "cream",
        disabled: cleanliness >= 90,
        action: () => this.showToastFrom(stage1Session.cleanPen(this.selectedPenId!, "player")),
      }),
      this.createActionButton({
        icon: "shop",
        label: "Птицы",
        tone: "gold",
        action: () => this.openShopTab("animals"),
      }),
    );
    this.penBody.appendChild(actions);

    if (birds.length <= 0) {
      this.penBody.appendChild(this.createMiniNote("Тут пусто"));
      return;
    }

    const birdGrid = document.createElement("div");
    birdGrid.className = "stage1-choice-grid";
    for (const bird of birds) {
      const def = STAGE1_ANIMAL_DEFS[bird.species];
      birdGrid.appendChild(this.createCard({
        title: bird.name,
        icon: this.getAnimalIcon(bird.species),
        badge: bird.hasProduct ? "Подарок" : bird.hunger >= 75 ? "Голод" : "Сыт",
        note: def.productNameRu,
        compact: true,
      }));
    }
    this.penBody.appendChild(birdGrid);
  }

  private renderPenPanelIfNeeded() {
    if (!this.selectedPenId) {
      return;
    }
    const penState = this.currentSnapshot.state.pens[this.selectedPenId];
    if (!penState) {
      this.closePenPanel();
      return;
    }
    const birds = this.currentSnapshot.state.animals.filter((animal) => animal.penId === this.selectedPenId);
    const nextKey = JSON.stringify({
      penId: this.selectedPenId,
      coins: this.currentSnapshot.state.coins,
      owned: penState.isOwned,
      cleanliness: Math.round(penState.cleanliness),
      birds: birds.map((bird) => `${bird.id}:${bird.species}:${bird.hasProduct ? 1 : 0}:${Math.round(bird.hunger)}`),
    });
    if (nextKey !== this.penRenderKey) {
      this.renderPenPanel();
    }
  }

  private syncOverlayState() {
    const anyModalOpen = this.shopOpen || Boolean(this.selectedPlotId) || Boolean(this.selectedPenId);
    this.overlayRoot.dataset.shopOpen = String(this.shopOpen);
    this.overlayRoot.dataset.modalOpen = String(anyModalOpen);
    this.modalBackdrop.dataset.open = String(anyModalOpen);
    this.shopWindow.dataset.open = String(this.shopOpen);
    this.plotWindow.dataset.open = String(Boolean(this.selectedPlotId));
    this.penWindow.dataset.open = String(Boolean(this.selectedPenId));
    this.topBar.hidden = anyModalOpen;
    this.hudRoot.hidden = anyModalOpen;
    this.promptBox.hidden = anyModalOpen;
    this.topBar.style.pointerEvents = anyModalOpen ? "none" : "auto";
    if (this.leftButton && this.rightButton) {
      this.leftButton.setVisible(!anyModalOpen);
      this.rightButton.setVisible(!anyModalOpen);
    }
    for (const control of this.mobileControlVisuals) {
      (control as Phaser.GameObjects.GameObject & { setVisible: (value: boolean) => unknown }).setVisible(!anyModalOpen);
    }
  }

  private getShopRenderKey() {
    const state = this.currentSnapshot.state;
    return JSON.stringify({
      tab: this.currentShopTab,
      coins: state.coins,
      animals: state.animals.map((animal) => animal.species),
      pens: state.pens,
      workerActive: state.workers[STAGE1_WORKER_TEMPLATE.id]?.isActive ?? false,
      feed: state.inventory[STAGE1_INVENTORY_FOOD_KEY] ?? 0,
      wheatSeeds: state.inventory[STAGE1_SEED_KEYS.WHEAT] ?? 0,
      carrotSeeds: state.inventory[STAGE1_SEED_KEYS.CARROT] ?? 0,
      cloverSeeds: state.inventory[STAGE1_SEED_KEYS.CLOVER] ?? 0,
      autoFeedLevel: state.upgrades[STAGE1_UPGRADE.id]?.level ?? 0,
      wheatLevel: state.upgrades[STAGE1_WHEAT_UPGRADE.id]?.level ?? 0,
      carrotOpen: stage1Session.isCropUnlocked("CARROT"),
      cloverOpen: stage1Session.isCropUnlocked("CLOVER"),
    });
  }

  private goToLocation(location: "MEADOW" | "GARDEN") {
    this.closePlotPanel();
    this.closePenPanel();
    this.showToastFrom(stage1Session.setActiveLocation(location));
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.leftButton.setPosition(86, gameSize.height - 92);
    this.rightButton.setPosition(188, gameSize.height - 92);
  }

  private showToastFrom(result: { message: string; tone: Stage1PromptTone }) {
    this.showToast(result.message, result.tone);
  }

  private createNavButton(actionId: string, config: ActionButtonConfig) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `stage1-nav stage1-nav--${config.tone ?? "green"}`;
    button.dataset.stage1Action = actionId;
    button.innerHTML = `
      <span class="stage1-nav__icon">${this.getIcon(config.icon)}</span>
      <span class="stage1-nav__label">${config.label}</span>
    `;
    button.addEventListener("click", config.action ?? (() => undefined));
    return button;
  }

  private createStatChip(icon: string, value: string) {
    const chip = document.createElement("div");
    chip.className = "stage1-stat";
    chip.innerHTML = `<span class="stage1-stat__icon">${this.getIcon(icon)}</span><span>${value}</span>`;
    return chip;
  }

  private createSummaryStrip(items: Array<{ icon: string; value: string }>) {
    const strip = document.createElement("div");
    strip.className = "stage1-summary-strip";
    for (const item of items) {
      const pill = document.createElement("div");
      pill.className = "stage1-summary-pill";
      pill.innerHTML = `${this.getIcon(item.icon)}<span>${item.value}</span>`;
      strip.appendChild(pill);
    }
    return strip;
  }

  private createMiniNote(text: string) {
    const note = document.createElement("div");
    note.className = "stage1-mini-note";
    note.textContent = text;
    return note;
  }

  private createCard(config: CardConfig) {
    const card = document.createElement("div");
    card.className = `stage1-card${config.compact ? " stage1-card--compact" : ""}`;
    card.innerHTML = `
      <div class="stage1-card__head">
        <div class="stage1-card__icon">${this.getIcon(config.icon)}</div>
        <div class="stage1-card__meta">
          <div class="stage1-card__title">${config.title}</div>
          ${config.note ? `<div class="stage1-card__note">${config.note}</div>` : ""}
        </div>
        ${config.badge ? `<div class="stage1-card__badge">${config.badge}</div>` : ""}
      </div>
      ${config.price ? `<div class="stage1-card__price">${this.getIcon("coin")}<span>${config.price}</span></div>` : ""}
    `;
    if (config.action) {
      card.appendChild(this.createActionButton(config.action));
    }
    return card;
  }

  private createActionButton(config: ActionButtonConfig) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `stage1-action stage1-action--${config.tone ?? "green"}`;
    button.disabled = Boolean(config.disabled);
    button.innerHTML = `${this.getIcon(config.icon)}<span>${config.label}</span>`;
    button.addEventListener("click", config.action ?? (() => undefined));
    return button;
  }

  private getAnimalIcon(species: Stage1AnimalSpecies) {
    switch (species) {
      case "CHICKEN":
        return "chicken";
      case "DUCK":
        return "duck";
      case "GOOSE":
        return "goose";
      case "TURKEY":
        return "turkey";
      case "CHICK":
      default:
        return "chick";
    }
  }

  private getIcon(name: string) {
    switch (name) {
      case "meadow":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 30c7-9 13-13 18-13s11 4 18 13v10H6Z" fill="#78c257"/><path d="M12 21c2-7 6-11 12-11s10 4 12 11" fill="#bde88d"/><circle cx="35" cy="12" r="5" fill="#ffd35f"/></svg>`;
      case "garden":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="26" width="36" height="12" rx="4" fill="#8e5a32"/><path d="M10 26h28" stroke="#643b1d" stroke-width="3"/><path d="M16 16c2-4 4-6 8-6 4 0 6 2 8 6" stroke="#62b347" stroke-width="4" stroke-linecap="round"/></svg>`;
      case "shop":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 18h32l-3 22H11Z" fill="#ffcf66"/><path d="M11 18 16 9h16l5 9" fill="#f27f63"/><path d="M18 26h12v14H18z" fill="#fff6e2"/></svg>`;
      case "worker":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="15" r="8" fill="#ffc994"/><path d="M13 39c2-8 7-12 11-12s9 4 11 12" fill="#6f8ecf"/><path d="M18 11c2-4 6-6 10-4" stroke="#8a5a32" stroke-width="4" stroke-linecap="round"/></svg>`;
      case "coin":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="16" fill="#ffd35f"/><circle cx="24" cy="24" r="10" fill="#ffeb99"/><path d="M24 17v14M19 21h8a3 3 0 0 1 0 6h-6" stroke="#9c6c11" stroke-width="3" stroke-linecap="round"/></svg>`;
      case "xp":
      case "spark":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m24 7 4 10 11 1-8 7 3 11-10-6-10 6 3-11-8-7 11-1Z" fill="#7bc7ff"/></svg>`;
      case "wheat":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 39V11" stroke="#8a5b1d" stroke-width="3" stroke-linecap="round"/><path d="M24 14c-6 0-9 5-9 5s3 5 9 5M24 20c6 0 9 5 9 5s-3 5-9 5" stroke="#e0b347" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      case "egg":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 9c7 0 13 10 13 18s-6 12-13 12-13-4-13-12S17 9 24 9Z" fill="#fff5da"/></svg>`;
      case "seed":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M17 27c0-7 5-12 12-12 2 7-1 16-8 18-3 1-4-3-4-6Z" fill="#8acb5a"/><path d="M20 31c7-1 14-6 17-13" stroke="#4c8537" stroke-width="3" stroke-linecap="round"/></svg>`;
      case "bag":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M16 17c0-5 3-8 8-8s8 3 8 8" stroke="#8a5a32" stroke-width="4"/><path d="M12 18h24l-2 21H14Z" fill="#d8b07a"/></svg>`;
      case "pen":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="18" width="34" height="18" rx="4" fill="#a96c3c"/><path d="M13 18v18M24 18v18M35 18v18" stroke="#7a4b26" stroke-width="3"/><path d="M10 14h28" stroke="#ddb77f" stroke-width="4" stroke-linecap="round"/></svg>`;
      case "broom":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8 18 20" stroke="#9e6a39" stroke-width="4" stroke-linecap="round"/><path d="M15 22c6 0 11 5 11 11H10c0-6 2-11 5-11Z" fill="#f0c65b"/><path d="M14 34h12" stroke="#c08f28" stroke-width="3" stroke-linecap="round"/></svg>`;
      case "open":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 24h20" stroke="#6d4c2c" stroke-width="4" stroke-linecap="round"/><path d="m24 16 10 8-10 8" fill="none" stroke="#6d4c2c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><rect x="8" y="12" width="12" height="24" rx="4" fill="#ffe6a0"/></svg>`;
      case "chicken":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="23" cy="27" rx="12" ry="10" fill="#fff3e0"/><circle cx="31" cy="19" r="7" fill="#fff3e0"/><path d="M30 13c4-5 8-4 8 2-3 0-5 1-7 4Z" fill="#dc6a54"/><path d="M37 22h8l-6 4" fill="#ffb24a"/></svg>`;
      case "duck":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="22" cy="28" rx="12" ry="10" fill="#d9f4ff"/><circle cx="30" cy="20" r="7" fill="#d9f4ff"/><path d="M36 23h8l-5 4" fill="#ffb24a"/></svg>`;
      case "goose":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="20" cy="29" rx="12" ry="10" fill="#f8f8f4"/><path d="M26 25c1-8 6-12 12-11 3 4 2 8-1 12-2 1-5 1-11-1Z" fill="#f8f8f4"/><path d="M37 24h8l-5 4" fill="#ff9e4d"/></svg>`;
      case "turkey":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M11 28c0-9 7-15 16-15 8 0 14 5 14 13-7-2-14 0-22 8-5 0-8-2-8-6Z" fill="#9b6745"/><circle cx="31" cy="20" r="6" fill="#9b6745"/><circle cx="38" cy="17" r="3" fill="#d64a58"/><path d="M35 22h8l-5 4" fill="#ffb24a"/></svg>`;
      case "carrot":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 12c7 5 9 14 2 24-8-2-12-9-9-17 1-3 4-5 7-7Z" fill="#ff9849"/><path d="M23 10c2-4 7-5 11-3M23 11c-1-4-5-6-9-5" stroke="#57a845" stroke-width="4" stroke-linecap="round"/></svg>`;
      case "clover":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="18" r="7" fill="#6cc16a"/><circle cx="30" cy="18" r="7" fill="#6cc16a"/><circle cx="18" cy="30" r="7" fill="#6cc16a"/><circle cx="30" cy="30" r="7" fill="#6cc16a"/><path d="M24 28c0 7-2 10-6 13" stroke="#4c8d49" stroke-width="3" stroke-linecap="round"/></svg>`;
      case "drop":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 10c6 9 10 14 10 19a10 10 0 1 1-20 0c0-5 4-10 10-19Z" fill="#68b8ff"/></svg>`;
      case "basket":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 20h20l-2 16H16Z" fill="#d3a060"/><path d="M18 20c1-5 3-8 6-8s5 3 6 8" stroke="#8b5a32" stroke-width="3"/></svg>`;
      case "lock":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="12" y="22" width="24" height="17" rx="4" fill="#c5baaa"/><path d="M17 22v-4a7 7 0 1 1 14 0v4" stroke="#8a7f73" stroke-width="4"/></svg>`;
      case "check":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="16" fill="#7ccc63"/><path d="m17 24 5 5 10-11" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      case "play":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18" fill="#7ccc63"/><path d="m20 16 13 8-13 8Z" fill="#fff"/></svg>`;
      case "pause":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18" fill="#ef8a80"/><rect x="18" y="16" width="4" height="16" rx="2" fill="#fff"/><rect x="26" y="16" width="4" height="16" rx="2" fill="#fff"/></svg>`;
      case "close":
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18" fill="#ef8a80"/><path d="M18 18 30 30M30 18 18 30" stroke="#fff7f0" stroke-width="4" stroke-linecap="round"/></svg>`;
      case "chick":
      default:
        return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="25" r="12" fill="#ffe36f"/><circle cx="31" cy="18" r="6" fill="#ffe36f"/><path d="M36 20h7l-5 4" fill="#ff9b47"/></svg>`;
    }
  }

  private makeCircleButton(x: number, y: number, label: string) {
    const circle = this.add.circle(x, y, 42, 0x183126, 0.94)
      .setScrollFactor(0)
      .setStrokeStyle(3, 0xe0c06b, 0.72)
      .setInteractive({ useHandCursor: true });
    const inner = this.add.circle(x, y - 8, 31, 0x2d5740, 0.34).setScrollFactor(0);
    const labelText = this.add.text(x, y, label, {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "30px",
      color: "#fff6d7",
      fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0);

    circle.on("pointerover", () => circle.setFillStyle(0x214233, 1));
    circle.on("pointerout", () => circle.setFillStyle(0x183126, 0.94));
    circle.setDepth(14);
    inner.setDepth(13);
    labelText.setDepth(15);
    this.mobileControlVisuals.push(circle, inner, labelText);
    return circle;
  }
}
