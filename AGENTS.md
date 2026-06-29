# AGENTS.md

## Purpose

This file defines the working rules for coding agents in **Max Farm / «Ферма Макса»**.

The project is being rewritten from the current React/DOM prototype into a maintainable **Phaser + TypeScript** game. Preserve the game itself, but do not preserve fragile implementation patterns from the legacy runtime.

These instructions apply to the whole repository unless a deeper directory contains its own `AGENTS.md` with more specific rules.

---

## Product vision

Max Farm is a calm, colorful 2D side-view farm game for children approximately **2–7 years old**.

Primary targets:

1. phones;
2. tablets;
3. desktop browsers.

Core experience:

- Max walks left and right through long illustrated locations;
- the camera follows Max horizontally;
- animals and workers make the world feel alive;
- the player feeds animals, collects products, plants crops, hires workers, buys upgrades, earns coins and XP, and unlocks content;
- interactions must be simple, forgiving, readable, and pleasant for a young child;
- saves must survive refreshes, app backgrounding, and ordinary browser interruptions.

Do not turn the project into a generic farming framework. Build the concrete game described by the repository content.

---

## Rewrite policy

The current React version is a **legacy reference implementation**.

Preserve:

- gameplay concepts and progression;
- locations and their intended order;
- animal species;
- workers and their roles;
- upgrades and prices unless a task explicitly changes balance;
- Max outfits;
- existing PNG/SVG/audio assets that are suitable;
- meaningful save data through an explicit migration layer;
- child-friendly visual identity.

Do not preserve:

- the giant `App.tsx` architecture;
- DOM nodes as game entities;
- React state as the frame-by-frame simulation engine;
- direct DOM mutation for movement;
- multiple competing animation loops;
- gameplay based on `setInterval` or device-dependent ticks;
- hidden mutations of nested state;
- hardcoded worker logic spread across large switch statements;
- viewport-percentage coordinates as canonical world coordinates;
- save logic that writes incomplete or transient state.

When legacy behavior conflicts with correctness, deterministic simulation, mobile stability, or these instructions, implement the corrected behavior and document the difference.

---

## Required technology direction

Use:

- **Phaser 4.2.0**, pinned to the exact version unless the owner explicitly approves an upgrade;
- TypeScript in strict mode;
- Vite for development and production builds;
- Phaser Arcade Physics only where collision or velocity handling is genuinely useful;
- browser storage behind a repository-owned persistence adapter;
- data-driven content definitions.

Do not add React back into the gameplay runtime. A separate web shell or admin tool may use React only after an explicit project decision.

Do not introduce a full ECS framework. This game is better served by small entity classes, focused systems, scenes, and typed domain state.

Avoid new runtime dependencies unless they solve a clear problem that cannot be handled simply inside the project.

---

## Intended source layout

Prefer this structure as the rewrite develops:

```text
src/
  main.ts
  game/
    createGame.ts
    gameConfig.ts
    constants.ts
    scenes/
      BootScene.ts
      PreloadScene.ts
      WorldScene.ts
      UIScene.ts
    entities/
      Max.ts
      Animal.ts
      Worker.ts
      WorldObject.ts
    systems/
      MovementSystem.ts
      InteractionSystem.ts
      AnimalSystem.ts
      WorkerSystem.ts
      ProgressionSystem.ts
      EconomySystem.ts
      TimeSystem.ts
      AudioSystem.ts
      SaveSystem.ts
    domain/
      state/
      commands/
      events/
      selectors/
      migrations/
    content/
      locations/
      animals/
      workers/
      upgrades/
      items/
    input/
      InputController.ts
      TouchController.ts
    ui/
      components/
      layout/
    persistence/
      SaveRepository.ts
      LocalStorageSaveRepository.ts
    assets/
      AssetManifest.ts
  styles/
  tests/
```

The exact tree may evolve, but keep the same separation of responsibilities.

---

## Architecture rules

### One authoritative game state

There must be one canonical serializable domain state for progression and persistent world data.

Examples of persistent state:

- coins;
- XP and level;
- unlocked locations;
- inventory;
- owned animals;
- animal needs and production state;
- crops and trees;
- owned upgrades;
- hired workers;
- Max outfit;
- relevant world-object state;
- simulation timestamps;
- settings that belong to the save.

Examples of transient runtime state that should normally not be saved:

- Phaser sprite instances;
- tweens;
- textures;
- scene references;
- pointer objects;
- temporary speech bubbles;
- animation frame counters;
- cached layout values;
- active sound objects.

Never store Phaser objects inside domain state.

### Commands change state

Gameplay changes should be expressed as typed commands or focused domain methods, for example:

- `MOVE_MAX`
- `BUY_ANIMAL`
- `FEED_ANIMAL`
- `COLLECT_PRODUCT`
- `PLANT_CROP`
- `HARVEST_CROP`
- `HIRE_WORKER`
- `BUY_UPGRADE`
- `CHANGE_LOCATION`

A command validates its preconditions, changes the canonical state, and emits domain events.

### Events drive presentation

Visuals and audio react to domain events such as:

- `CoinsChanged`
- `XpGained`
- `LevelUp`
- `AnimalFed`
- `ProductCollected`
- `WorkerTaskStarted`
- `WorkerTaskCompleted`
- `LocationUnlocked`

Do not make UI components independently modify overlapping pieces of game state.

### Systems remain focused

Each system must have one clear responsibility. Avoid systems that both simulate gameplay, manipulate menus, load assets, save data, and play audio.

### Prefer composition

Use small components and helpers instead of deep inheritance trees. Shared behavior should be composed through typed collaborators.

---

## World and camera rules

The outdoor game is a horizontal side-view world.

- Outdoor movement is left/right only.
- Outdoor gameplay must not depend on free vertical movement.
- Use world pixel coordinates as the source of truth.
- Each location defines explicit world bounds and a ground line or allowed movement segment.
- Preserve the natural aspect ratio of illustrated backgrounds.
- Do not stretch backgrounds with `100% 100%`.
- The camera follows Max horizontally and is clamped to location bounds.
- Use `Phaser.Scale.FIT` and `Phaser.Scale.CENTER_BOTH`.
- Default logical game size: **1280 × 720** unless a measured implementation need proves otherwise.
- Support safe areas and browser UI on mobile devices.
- UI must remain screen-space UI and must not drift with the world camera.

Large locations should feel wider on phones, not squeezed into one screen. The phone viewport shows a smaller portion of the same world and the camera travels through it.

---

## Simulation and time

All simulation must be based on elapsed time, not the number of timer callbacks.

Rules:

- use Phaser scene update time or a controlled fixed-step simulation;
- convert milliseconds explicitly;
- clamp unusually large deltas after tab restoration;
- use timestamps for crops, production, hunger, and offline progress where appropriate;
- do not make progression faster or slower because a phone uses a different update interval;
- do not run independent intervals for every animal or worker;
- pause or reduce nonessential simulation when the page is hidden;
- restore safely after `visibilitychange`, `pagehide`, and mobile app backgrounding.

XP processing must support gaining multiple levels from a single reward. Use a loop, not a single conditional level-up check.

Random behavior must be controllable in tests. Inject or wrap randomness rather than calling `Math.random()` throughout domain code.

---

## Animals

Animals are data-driven entities with reusable behavior.

An animal definition should describe at least:

- species ID;
- display name;
- preferred location or pen type;
- purchase price;
- product and production duration;
- hunger/cleanliness rules;
- movement characteristics;
- available visual states;
- sprite or fallback asset keys;
- sound keys where available.

Runtime behavior may include:

- idle;
- wander;
- approach food;
- eat;
- produce;
- happy reaction;
- hungry reaction;
- dirty reaction;
- sleep or rest where relevant.

Do not create a separate custom simulation loop for each species. Special species behavior should be implemented through small typed strategies or configuration.

When an asset is missing, use an intentional SVG placeholder or approved fallback. Never silently display an unrelated species.

---

## Workers

Workers must use a small state machine instead of a giant ID-based switch statement.

Recommended states:

```text
idle
choose-task
walk-to-target
work
return
rest
blocked
```

Worker definitions contain identity, role, price, unlock conditions, movement speed, visual asset, and capabilities.

Worker AI must:

- choose from valid tasks;
- reserve a task or target when necessary;
- release reservations when interrupted;
- avoid duplicating the same reward;
- fail safely if a target disappears;
- use shared movement and work logic;
- remain deterministic enough to reproduce bugs.

Workers should look alive but must not consume excessive CPU on mobile devices. Use low-frequency decision-making and normal frame-based movement.

---

## Input rules

The game is touch-first.

Required principles:

- a normal tap performs the primary action;
- visible buttons are preferred over hidden gestures;
- touch targets should normally be at least 48 logical pixels;
- important actions need generous hit areas;
- dragging and camera gestures must not accidentally trigger purchases;
- double tap may replace desktop modifier-click behavior only when clearly appropriate;
- long press is reserved for optional secondary information, not essential progress;
- keyboard controls are supported on desktop but must not be required;
- pointer input should be handled through one input controller, not scattered across entities.

For a game aimed at young children, avoid tiny labels, dense menus, ambiguous icons, and actions that require precise timing.

Purchases and destructive actions should use a simple, readable confirmation pattern when accidental activation would be frustrating.

---

## UI and child experience

Design for a child who may not read fluently.

- Prefer recognizable icons plus short labels.
- Use large controls and clear visual feedback.
- Keep one primary decision per panel.
- Avoid overlapping windows.
- Avoid information-dense desktop dashboards on phones.
- Show cause and effect immediately: item moves, animal reacts, sound plays, counter changes.
- Keep failure gentle. Do not punish a child for slow input.
- Never use dark patterns, artificial urgency, loot-box behavior, or accidental-spend traps.
- Do not add advertising, analytics, external accounts, or network tracking without an explicit owner request.

The game must remain usable without audio. Important feedback needs a visual equivalent.

---

## Assets

Existing assets are valuable project content.

Before adding a replacement:

1. inspect the asset manifest and public asset folders;
2. check whether an equivalent PNG, SVG, or audio file already exists;
3. verify dimensions and transparency;
4. use a stable semantic key;
5. preload every state that can appear during gameplay.

Asset requirements:

- preserve source aspect ratio;
- avoid runtime paths assembled from unvalidated user-facing names;
- centralize keys and paths in an asset manifest;
- use lowercase kebab-case file names for new assets;
- do not overwrite original art just to resize it;
- optimize large textures for mobile memory without destroying the source file;
- document any generated fallback asset;
- never count a failed preload as a successful load;
- display a controlled fallback and log enough detail to diagnose missing assets.

Missing final artwork should not block architecture work. Add a clearly named temporary SVG placeholder and keep replacement easy.

---

## Saving and migrations

Every save document must include a schema version.

Recommended envelope:

```ts
interface SaveGameV2 {
  schemaVersion: 2;
  savedAt: string;
  profile: PlayerProfileState;
  world: WorldState;
  economy: EconomyState;
  progression: ProgressionState;
  settings: SaveSettings;
}
```

Rules:

- validate loaded data before use;
- migrate old saves through explicit ordered migration functions;
- never merge arbitrary unvalidated JSON directly into live state;
- keep a backup of the last known-good save before replacing it;
- use atomic-style writes where browser storage permits;
- debounce routine writes, but force-save on important lifecycle events;
- save after purchases, unlocks, rewards, and other important irreversible actions;
- save on `visibilitychange`, `pagehide`, and controlled shutdown paths;
- handle storage quota and corrupted JSON without crashing the game;
- preserve the legacy save during early migration work so recovery remains possible.

A save bug is a release-blocking bug.

---

## Performance budget

Mobile performance is the default constraint.

- Target stable 60 FPS on ordinary modern phones and tablets.
- The game must degrade gracefully near 30 FPS without changing simulation speed.
- Avoid per-frame object allocation in hot paths.
- Reuse temporary vectors and objects where practical.
- Pool frequently created effects, particles, and speech bubbles.
- Cull or sleep distant entities when safe.
- Do not preload every future location into GPU memory.
- Load location-specific assets when needed and release them when appropriate.
- Limit simultaneous particles and expensive blend effects on mobile.
- Do not use CSS filters or DOM overlays as substitutes for Phaser rendering in the game world.
- Measure before adding complex optimization code.

Any new animation loop, timer, event listener, or scene subscription must have a clear cleanup path.

---

## TypeScript and code style

- Keep TypeScript strict.
- Do not use `any` to bypass modeling work.
- Use discriminated unions for commands, events, entity modes, and task states.
- Prefer named types over large anonymous object shapes.
- Keep public APIs small.
- Use early returns for invalid conditions.
- Separate pure domain calculations from Phaser-facing code.
- Keep functions short enough to understand without scrolling through unrelated behavior.
- Name units explicitly: `durationMs`, `speedPxPerSecond`, `savedAtIso`.
- Never rely on a comment to correct ambiguous units.
- Avoid magic numbers; put gameplay constants in content data or named constants.
- Comments should explain intent and constraints, not restate syntax.

Do not make broad formatting changes in files unrelated to the task.

---

## Error handling and diagnostics

- Fail loudly in development for invalid content definitions.
- In production, recover to a controlled state where possible.
- Include entity IDs, location IDs, and command names in meaningful diagnostic messages.
- Do not leave noisy per-frame logs.
- Do not swallow asset, save, or migration failures.
- User-facing errors must be simple and nontechnical.
- Developer diagnostics must contain enough context to reproduce the issue.

Temporary debug UI must be disabled in production builds unless explicitly exposed as a developer mode.

---

## Testing requirements

New domain behavior should be testable without starting a Phaser renderer.

At minimum, cover:

- XP rewards and multiple level-ups;
- purchases with enough and insufficient coins;
- animal feeding and product collection;
- worker task reservation and completion;
- crop and production timing;
- save serialization and validation;
- every save migration;
- corrupted save recovery;
- location bounds and camera clamp calculations;
- touch interaction guards that prevent duplicate activation.

For important gameplay flows, add browser-level tests where practical:

1. start a new game;
2. move Max with touch/pointer input;
3. feed one animal;
4. collect one product;
5. receive coins and XP exactly once;
6. save;
7. reload;
8. verify the same state is restored.

Tests must not depend on real-time waiting when a clock can be injected or advanced.

---

## Required verification before completion

Use the repository scripts when available. The rewrite should eventually provide clear scripts for:

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm run test
npm run test:e2e
```

For every task, run the relevant available checks. Never claim a command passed unless it was actually executed successfully.

If the connector environment prevents local execution, state exactly what was changed and what remains unverified.

A task is not complete merely because TypeScript compiles. Also verify the affected gameplay path, state transition, save behavior, and mobile layout implications.

---

## Stage 1 vertical slice

The first rewrite milestone should prove the architecture using a small complete slice:

- Meadow location;
- Max with horizontal movement;
- horizontally following camera;
- one chick or chicken;
- one worker;
- tap-based interaction;
- feed animal;
- collect one product;
- coins;
- XP and level-up;
- minimal shop purchase;
- save and reload;
- phone and tablet scaling;
- mobile lifecycle save;
- no dependency on legacy React gameplay code.

Do not migrate all animals, locations, menus, and workers before this slice is stable.

---

## Git workflow

Primary rewrite branch:

```text
rewrite/phaser-stage-1
```

Make small commits with a single purpose. Preferred message style:

```text
chore: add Phaser game bootstrap
feat: add Meadow world scene
feat: add touch movement controller
feat: add versioned save repository
fix: prevent duplicate animal reward
refactor: extract worker task state machine
```

Rules:

- inspect the current branch and file contents before writing;
- do not commit generated build output;
- do not commit secrets or local environment files;
- do not rewrite unrelated history;
- do not force-push unless the owner explicitly requests it;
- keep legacy code available through Git history while replacement is in progress;
- avoid mixing asset replacement, balance changes, and architecture refactors in one commit.

---

## Agent working procedure

Before coding:

1. read this file;
2. inspect relevant source and content definitions;
3. identify whether the task affects persistent state or save migrations;
4. identify mobile and touch consequences;
5. find existing assets before inventing new paths;
6. define a small verifiable completion target.

While coding:

1. keep the domain state authoritative;
2. avoid duplicated sources of truth;
3. use elapsed time correctly;
4. clean up listeners and scene resources;
5. preserve existing game content unless the task changes it;
6. add or update tests with behavior changes;
7. keep changes narrow.

Before reporting completion:

1. inspect the final diff;
2. run available checks;
3. verify no save fields were silently dropped;
4. verify the affected touch flow;
5. verify world coordinates and camera behavior on narrow screens;
6. list any unverified assumptions honestly.

Communicate progress and final summaries to the project owner in **Russian**, using clear language and concrete file names.

---

## Hard prohibitions

Do not:

- rebuild the game as moving HTML elements;
- add a second competing game-state store;
- mutate nested persistent state invisibly;
- tie simulation speed to frame count or timer count;
- save Phaser runtime objects;
- stretch location artwork to fit arbitrary viewports;
- require hover, right click, Shift-click, or keyboard input for core mobile gameplay;
- hide critical child actions behind long press;
- use tiny desktop UI on phones;
- silently discard legacy save data;
- award the same product or purchase twice from one tap;
- treat failed asset loads as success;
- add unrelated features during migration;
- replace existing art without checking the repository first;
- state that tests passed when they were not run.

---

## Definition of done

A change is done when:

- it follows this architecture or clearly improves it;
- its state transitions are correct and occur once;
- it works with touch input;
- it does not make simulation device-speed dependent;
- it preserves or deliberately migrates save data;
- it handles missing assets and invalid state safely;
- relevant tests or checks pass;
- the diff contains no unrelated rewrites;
- the completion report states what changed, what was tested, and any remaining limitation.
