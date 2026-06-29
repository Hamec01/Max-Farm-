import { chromium } from "playwright";

const baseUrl = process.env.STAGE1_BASE_URL ?? "http://127.0.0.1:5173";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForStage1(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => {
    const game = window.__stage1Game;
    const worldScene = game?.scene?.getScene?.("WorldScene");
    return Boolean(worldScene?.plotRuntime?.get?.("plot1"));
  }, null, { timeout: 10000 });
}

async function getShopBounds(page) {
  await page.click('[data-stage1-action="toggle-shop"]');
  const layout = await page.evaluate(() => {
    const bounds = document.querySelector(".stage1-window--shop")?.getBoundingClientRect();
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null,
    };
  });
  assert(layout.bounds, "Shop modal should exist.");
  await page.evaluate(() => window.__stage1Game?.scene?.getScene?.("UIScene")?.toggleShop(false));
  return layout;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await waitForStage1(page);

  const starter = await page.evaluate(() => {
    const session = window.__stage1Session;
    session.resetToDefaults();
    return session.getSnapshot().state;
  });

  assert(starter.coins === 50, "Fresh Stage 2 save should start with 50 coins.");
  assert(starter.inventory.WHEAT_SEED === 5, "Fresh Stage 2 save should start with 5 wheat seeds.");
  assert(starter.inventory.WHEAT === 3, "Fresh Stage 2 save should start with 3 feed.");
  assert(starter.inventory.CHICK_PRODUCT === 1, "Fresh Stage 2 save should start with 1 starter product.");
  assert(starter.pens["bird-pen-1"]?.isOwned === true, "First bird pen should be owned.");
  assert(starter.pens["bird-pen-2"]?.isOwned === false, "Second bird pen should start locked.");
  assert(starter.animals.length === 1 && starter.animals[0].penId === "bird-pen-1", "Starter bird should live in the first pen.");
  assert(starter.workers["worker-mama"].isActive === true, "Mama should start active.");

  const topNav = await page.locator("[data-stage1-action]").evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.replace(/\s+/g, " ").trim()),
  );
  assert(topNav.length === 3, "Top navigation should only contain three buttons.");
  assert(topNav[0]?.includes("Луг"), "Top navigation should contain Луг.");
  assert(topNav[1]?.includes("Грядки"), "Top navigation should contain Грядки.");
  assert(topNav[2]?.includes("Магазин"), "Top navigation should contain Магазин.");

  await page.evaluate(() => window.__stage1Session?.setActiveLocation("GARDEN"));
  await page.waitForFunction(() => window.__stage1Session?.getSnapshot().state.activeLocation === "GARDEN");

  await page.evaluate(() => {
    const session = window.__stage1Session;
    const game = window.__stage1Game;
    session.resetToDefaults();
    session.setActiveLocation("GARDEN");
    const worldScene = game.scene.getScene("WorldScene");
    worldScene.playerRuntime.x = 180;
    worldScene.playerRuntime.targetX = 180;
    worldScene.player.x = 180;
    window.__stage1Game.scene.getScene("WorldScene");
    window.__stage1Game.scene.getScene("UIScene");
    window.__stage1Game.scene.keys.UIScene.events.emit?.("plot:open", "plot1");
  });
  await page.evaluate(() => window.__stage1Game?.scene?.getScene?.("UIScene")?.openPlotPanel?.("plot1"));
  await page.waitForFunction(() => {
    const uiScene = window.__stage1Game?.scene?.getScene?.("UIScene");
    return uiScene?.selectedPlotId === "plot1" && document.querySelector(".stage1-window--plot")?.getAttribute("data-open") === "true";
  }, null, { timeout: 12000 });

  const plantFromFresh = await page.evaluate(() => window.__stage1Session?.plantCrop("plot1", "WHEAT"));
  assert(plantFromFresh?.ok === true, "New player should be able to plant wheat without buying it first.");

  await page.evaluate(() => window.__stage1Game?.scene?.getScene?.("UIScene")?.toggleShop(true));
  await page.waitForTimeout(120);

  const modalBlocking = await page.evaluate(() => {
    const game = window.__stage1Game;
    const worldScene = game.scene.getScene("WorldScene");
    const uiScene = game.scene.getScene("UIScene");
    const hud = document.querySelector(".stage1-hud");
    const nav = document.querySelector(".stage1-topbar");
    return {
      beforeTargetX: worldScene.playerRuntime.targetX,
      hudHidden: hud?.hidden === true || getComputedStyle(hud).visibility === "hidden",
      navHidden: nav?.hidden === true || getComputedStyle(nav).visibility === "hidden",
      leftVisible: uiScene.leftButton.visible,
      workerTabExists: Array.from(document.querySelectorAll(".stage1-tab span")).some((node) => {
        const text = node.textContent?.trim();
        return text === "Работники" || text === "Мама";
      }),
    };
  });

  assert(modalBlocking.workerTabExists === true, "The shop should contain the worker tab.");
  assert(modalBlocking.hudHidden === true, "HUD should be hidden while the big menu is open.");
  assert(modalBlocking.navHidden === true, "Top navigation should be hidden while the big menu is open.");
  assert(modalBlocking.leftVisible === false, "Joystick should be hidden while the big menu is open.");

  await page.mouse.click(700, 450);
  await page.waitForTimeout(100);
  const afterBlockedClick = await page.evaluate(() => window.__stage1Game.scene.getScene("WorldScene").playerRuntime.targetX);
  assert(afterBlockedClick === modalBlocking.beforeTargetX, "World input should stay blocked while the menu is open.");

  const boughtBird = await page.evaluate(() => {
    const result = window.__stage1Session.buyAnimal("CHICKEN");
    return { ok: result.ok, count: window.__stage1Session.getSnapshot().state.animals.length };
  });
  assert(boughtBird.ok === true && boughtBird.count === 2, "Player should be able to buy one extra bird into the owned pen.");

  await page.evaluate(() => window.__stage1Session.toggleWorkerActive());
  await page.click('[data-stage1-close="shop"]');
  await page.reload({ waitUntil: "networkidle" });

  const workerReload = await page.evaluate(() => {
    const state = window.__stage1Session?.getSnapshot().state;
    return state?.workers["worker-mama"]?.isActive ?? null;
  });
  assert(workerReload === false, "Mama state should persist after reload.");

  const desktopLayout = await getShopBounds(page);
  assert(desktopLayout.bounds.x >= 0, "Desktop modal should stay inside the left edge.");
  assert(desktopLayout.bounds.y >= 0, "Desktop modal should stay inside the top edge.");
  assert(desktopLayout.bounds.x + desktopLayout.bounds.width <= desktopLayout.viewport.width, "Desktop modal should stay inside the right edge.");
  assert(desktopLayout.bounds.y + desktopLayout.bounds.height <= desktopLayout.viewport.height, "Desktop modal should stay inside the bottom edge.");

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(150);
  const phoneLandscapeLayout = await getShopBounds(page);
  assert(phoneLandscapeLayout.bounds.x >= 0, "Phone landscape modal should stay inside the left edge.");
  assert(phoneLandscapeLayout.bounds.y >= 0, "Phone landscape modal should stay inside the top edge.");
  assert(phoneLandscapeLayout.bounds.x + phoneLandscapeLayout.bounds.width <= phoneLandscapeLayout.viewport.width, "Phone landscape modal should stay inside the right edge.");
  assert(phoneLandscapeLayout.bounds.y + phoneLandscapeLayout.bounds.height <= phoneLandscapeLayout.viewport.height, "Phone landscape modal should stay inside the bottom edge.");

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(150);
  const tabletLandscapeLayout = await getShopBounds(page);
  assert(tabletLandscapeLayout.bounds.x >= 0, "Tablet landscape modal should stay inside the left edge.");
  assert(tabletLandscapeLayout.bounds.y >= 0, "Tablet landscape modal should stay inside the top edge.");
  assert(tabletLandscapeLayout.bounds.x + tabletLandscapeLayout.bounds.width <= tabletLandscapeLayout.viewport.width, "Tablet landscape modal should stay inside the right edge.");
  assert(tabletLandscapeLayout.bounds.y + tabletLandscapeLayout.bounds.height <= tabletLandscapeLayout.viewport.height, "Tablet landscape modal should stay inside the bottom edge.");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(150);

  const backupSource = await page.evaluate(() => {
    const session = window.__stage1Session;
    session.resetToDefaults();
    session.getState().coins = 300;
    session.buyPen("bird-pen-2");
    session.buyAnimal("CHICKEN");
    session.toggleWorkerActive();
    session.save();
    return localStorage.getItem("max-farm-stage1-save");
  });
  assert(backupSource, "Current Stage 2 save is missing before backup recovery checks.");

  const backupContext = await browser.newContext();
  await backupContext.addInitScript((payload) => {
    localStorage.setItem("max-farm-stage1-save-backup", payload.goodSave);
    localStorage.setItem("max-farm-stage1-save", "{broken-json");
  }, { goodSave: backupSource });
  const backupPage = await backupContext.newPage();
  await waitForStage1(backupPage);
  const recoveredFromBackup = await backupPage.evaluate(() => {
    const state = window.__stage1Session?.getSnapshot().state;
    return {
      secondPen: state?.pens["bird-pen-2"]?.isOwned ?? false,
      animalCount: state?.animals.length ?? 0,
      workerActive: state?.workers["worker-mama"]?.isActive ?? true,
    };
  });
  assert(recoveredFromBackup.secondPen === true, "Broken primary save should recover second pen from backup.");
  assert(recoveredFromBackup.animalCount === 2, "Broken primary save should recover birds from backup.");
  assert(recoveredFromBackup.workerActive === false, "Broken primary save should recover worker state from backup.");
  await backupContext.close();

  const offlineSource = await page.evaluate(() => {
    const session = window.__stage1Session;
    session.resetToDefaults();
    session.setActiveLocation("GARDEN");
    session.plantCrop("plot1", "WHEAT");
    session.waterCrop("plot1");
    session.setActiveLocation("MEADOW");
    session.getState().pens["bird-pen-1"].cleanliness = 70;
    session.getState().animals[0].hunger = 10;
    session.save();
    return localStorage.getItem("max-farm-stage1-save");
  });
  assert(offlineSource, "Offline progress source save should exist.");

  const offlineContext = await browser.newContext();
  await offlineContext.addInitScript((payload) => {
    const parsed = JSON.parse(payload.rawSave);
    parsed.updatedAt = new Date(Date.now() - 180000).toISOString();
    localStorage.setItem("max-farm-stage1-save", JSON.stringify(parsed));
  }, { rawSave: offlineSource });
  const offlinePage = await offlineContext.newPage();
  await waitForStage1(offlinePage);
  const offlineProgress = await offlinePage.evaluate(() => {
    const state = window.__stage1Session?.getSnapshot().state;
    return {
      growth: state?.crops.plot1?.growth ?? 0,
      hunger: state?.animals[0]?.hunger ?? 0,
      cleanliness: state?.pens["bird-pen-1"]?.cleanliness ?? 0,
    };
  });
  assert(offlineProgress.growth > 0, "Offline progress should advance crop growth.");
  assert(offlineProgress.hunger > 10, "Offline progress should advance animal hunger.");
  assert(offlineProgress.cleanliness < 70, "Offline progress should reduce pen cleanliness.");
  await offlineContext.close();

  const legacyContext = await browser.newContext();
  await legacyContext.addInitScript(() => {
    localStorage.removeItem("max-farm-stage1-save");
    localStorage.removeItem("max-farm-stage1-save-backup");
    localStorage.setItem("maxim_fermer_save", JSON.stringify({
      coins: 222,
      level: 4,
      experience: 17,
      inventory: {
        WHEAT: 5,
        WHEAT_SEED: 6,
        CARROT_SEED: 2,
        CLOVER_SEED: 1,
        CARROT: 3,
        CLOVER: 2,
        TINY_EGG: 2,
      },
      upgrades: {
        autoFeeder: 1,
      },
      animals: [
        { species: "CHICK", customName: "Legacy Chick", isFed: true, productionProgress: 100, happiness: 88 },
        { species: "DUCK", customName: "Legacy Duck", isFed: false, productionProgress: 0, happiness: 70 },
      ],
      workers: [
        { id: "worker-mama", isActive: true },
      ],
    }));
  });
  const legacyPage = await legacyContext.newPage();
  await waitForStage1(legacyPage);
  const migratedLegacy = await legacyPage.evaluate(() => {
    const state = window.__stage1Session?.getSnapshot().state;
    return {
      coins: state?.coins ?? 0,
      level: state?.level ?? 0,
      experience: state?.experience ?? 0,
      carrotUnlocked: (state?.upgrades.unlockCarrotSeeds?.level ?? 0) > 0,
      cloverUnlocked: (state?.upgrades.unlockCloverSeeds?.level ?? 0) > 0,
      workerActive: state?.workers["worker-mama"]?.isActive ?? false,
      animalName: state?.animals[0]?.name ?? "",
      secondSpecies: state?.animals[1]?.species ?? "",
    };
  });
  assert(migratedLegacy.coins === 222, "Legacy migration should keep coins.");
  assert(migratedLegacy.level === 4, "Legacy migration should keep level.");
  assert(migratedLegacy.experience === 17, "Legacy migration should keep experience.");
  assert(migratedLegacy.carrotUnlocked === true, "Legacy migration should unlock carrot.");
  assert(migratedLegacy.cloverUnlocked === true, "Legacy migration should unlock clover.");
  assert(migratedLegacy.workerActive === true, "Legacy migration should keep worker activation.");
  assert(migratedLegacy.animalName === "Legacy Chick", "Legacy migration should keep custom bird names.");
  assert(migratedLegacy.secondSpecies === "DUCK", "Legacy migration should import supported bird species.");
  await legacyContext.close();

  const rescueContext = await browser.newContext();
  await rescueContext.addInitScript(() => {
    localStorage.setItem("max-farm-stage1-save", JSON.stringify({
      version: 3,
      updatedAt: new Date().toISOString(),
      state: {
        activeLocation: "MEADOW",
        coins: 0,
        level: 1,
        experience: 0,
        inventory: {
          WHEAT_SEED: 0,
          CARROT_SEED: 0,
          CLOVER_SEED: 0,
          WHEAT: 0,
          CARROT: 0,
          CLOVER: 0,
          CHICK_PRODUCT: 0,
          CHICKEN_PRODUCT: 0,
          DUCK_PRODUCT: 0,
          GOOSE_PRODUCT: 0,
          TURKEY_PRODUCT: 0,
        },
        animals: [
          {
            id: "stage1-bird-1",
            species: "CHICK",
            name: "Цыпа",
            mood: "hungry",
            happiness: 50,
            hunger: 100,
            productionProgress: 0,
            hasProduct: false,
            position: { laneId: "meadow-main", x: 810 },
            penId: "bird-pen-1",
          },
        ],
        crops: {
          plot1: { id: "plot1", cropType: null, growth: 0, watered: false },
          plot2: { id: "plot2", cropType: null, growth: 0, watered: false },
          plot3: { id: "plot3", cropType: null, growth: 0, watered: false },
          plot4: { id: "plot4", cropType: null, growth: 0, watered: false },
        },
        unlockedPlots: ["plot1"],
        upgrades: {
          autoFeeder: { id: "autoFeeder", level: 0 },
          wheatYield: { id: "wheatYield", level: 0 },
          unlockCarrotSeeds: { id: "unlockCarrotSeeds", level: 0 },
          unlockCloverSeeds: { id: "unlockCloverSeeds", level: 0 },
        },
        workers: {
          "worker-mama": { id: "worker-mama", name: "Мама Женя", role: "Заботливая кормилица", isActive: true },
        },
        pens: {
          "bird-pen-1": { id: "bird-pen-1", isOwned: true, cleanliness: 90 },
          "bird-pen-2": { id: "bird-pen-2", isOwned: false, cleanliness: 100 },
        },
        tasks: [],
        starterRescueUsed: false,
      },
    }));
  });
  const rescuePage = await rescueContext.newPage();
  await waitForStage1(rescuePage);
  const rescueFirst = await rescuePage.evaluate(() => window.__stage1Session?.getSnapshot().state);
  assert(rescueFirst.inventory.WHEAT_SEED === 3, "Emergency starter grant should give 3 wheat seeds.");
  assert(rescueFirst.starterRescueUsed === true, "Emergency starter grant should mark itself used.");
  await rescueContext.close();

  console.log("Stage 2 smoke test passed.");
} finally {
  await browser.close();
}
