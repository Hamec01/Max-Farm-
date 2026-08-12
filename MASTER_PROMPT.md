# MASTER_PROMPT.md — мастер-промт для разработки «Фермы Макса»

Ты — lead game engineer, gameplay architect и технический геймдизайнер проекта **«Ферма Макса»**.

Твоя задача — разрабатывать игру с нуля, последовательно, не возвращаясь к старой проблемной архитектуре. В репозитории могли остаться только sprites и отдельные старые документы/ассеты. Любой найденный старый код сначала оценивай как reference, а не как основу новой реализации.

Перед началом работы обязательно:

1. прочитай `AGENTS.md`;
2. прочитай `ROADMAP.md`;
3. проверь реальное состояние текущей ветки;
4. проверь существующие sprites/assets;
5. определи текущий незавершённый Stage;
6. не переходи к следующему Stage, пока текущий не выполнен и не проверен.

Если старые документы расходятся с `ROADMAP.md` по продуктовому scope, используй `ROADMAP.md` как актуальную продуктовую спецификацию. Архитектурные и safety-ограничения `AGENTS.md` остаются обязательными.

---

# 1. Что нужно построить

Нужна яркая детская **2D arcade farm game** про Макса, животных и развитие фермы.

Возраст: примерно 2–7 лет.

Главные платформы:

1. мобильный телефон;
2. планшет;
3. PC только как дополнительная платформа.

Основная ориентация: landscape.

Игра должна легко управляться пальцем и выглядеть живой даже когда игрок ничего не нажимает.

---

# 2. Две основные игровые части

## A. Animal Habitat Locations

Длинные горизонтальные игровые локации с животными и декоративными/полезными объектами.

В них могут быть:

- загоны;
- пруды;
- яблони;
- фруктовые деревья;
- домики;
- кормушки;
- водопой;
- мостики;
- цветочные зоны;
- фонари;
- игровые bonus objects;
- работники;
- бабочки;
- падающие звёзды.

Макс гуляет, взаимодействует с животными и собирает бонусы.

## B. Farm Production Location

Отдельная ферма/огород с грядками.

Макс:

- сеет;
- поливает;
- собирает;
- получает корм;
- кормит животных;
- продаёт лишнее;
- улучшает инструменты и производство.

Работники постепенно автоматизируют эту работу.

---

# 3. Ключевой gameplay loop

Основной цикл должен быть простым:

```text
играть с животными
-> ухаживать
-> получать продукты
-> выращивать корм
-> получать Coins + XP
-> повышать Level
-> покупать животных / работников / инструменты
-> покупать новые Locations
-> улучшать Locations
-> автоматизировать рутину
-> открывать новый контент
```

Игрок не должен быть наказан за то, что долго не заходил.

Животные:

- не умирают;
- не заболевают необратимо;
- не исчезают;
- при недостатке ухода просто хотят внимания и медленнее производят ресурс.

---

# 4. Mobile-first управление

Не проектируй интерфейс сначала для мыши.

Основные действия:

- tap по земле -> Макс идёт туда по X;
- tap по объекту -> Макс автоматически подходит к interaction anchor;
- tap по животному -> выбрать/погладить;
- drag животного -> переместить;
- быстрый flick при drag -> мягко подбросить;
- contextual button -> кормить;
- contextual button -> расчёсывать/мыть/стричь;
- tap по бабочке -> поймать;
- tap по падающей звезде -> поймать.

На PC можно добавить arrows/A-D, но gameplay не должен зависеть от клавиатуры.

Не использовать обязательные:

- hover;
- right click;
- Shift-click;
- tiny controls;
- сложные комбинации;
- precision drag маленьких элементов.

---

# 5. Решение старых проблем с движением и расстановкой

Это критическое требование.

**Не разрешай свободное произвольное размещение мира.**

Каждая Location должна иметь data definition:

```ts
interface LocationDefinition {
  id: LocationId;
  worldWidth: number;
  worldHeight: number;
  playerWalkY: number;
  playerSpawnX: number;
  animalZones: AnimalZoneDefinition[];
  buildingSlots: BuildingSlotDefinition[];
  workerAnchors: WorkerAnchorDefinition[];
  interactionAnchors: InteractionAnchorDefinition[];
  flowerSpawns: SpawnPoint[];
  collectiblePaths: CollectiblePath[];
}
```

Животные находятся только внутри `AnimalZone`.

```ts
interface AnimalZoneDefinition {
  id: string;
  minX: number;
  maxX: number;
  anchorY: number;
  compatibleSpecies: AnimalSpecies[];
  capacity: number;
}
```

Пруды, загоны, деревья, домики и другие крупные объекты устанавливаются только в заранее созданные `BuildingSlot`.

Работники идут только между заранее определёнными anchors.

Не применять свободный 2D pathfinding для работников.

Главная игровая ось — X.

Y для gameplay задаётся сценой/зоной/anchor и не должен хаотично накапливаться.

Во время toss разрешается временное визуальное движение по Y, но после приземления животное обязано вернуться в валидную область.

---

# 6. Животные

Полный roster:

```text
CHICK
CHICKEN
DUCK
GOOSE
TURKEY
RABBIT
SHEEP
PIG
GOAT
COW
DONKEY
HORSE
BULL
CAT
DOG
T_REX
TRICERATOPS
PTERODACTYL
DIPLODOCUS
FENNEC
CAMEL
PEACOCK
SWAN
```

Каждый вид описывается data/config, а не отдельной большой системой.

Минимальные параметры:

```text
id
name
preferredLocation
compatibleLocations
purchasePrice
requiredLevel
feedTypes
careType
movementProfile
productType / companionReward
productionDuration
assetKeys
soundKeys
```

Общие needs:

```text
Hunger
Affection
Cleanliness
```

Общие состояния:

```text
IDLE
WANDER
HUNGRY
APPROACH_FOOD
EATING
HAPPY
DIRTY
PRODUCING
READY
SLEEPING
DRAGGED
TOSSED
```

Не все животные должны выдавать физический продукт.

Продукты:

- CHICKEN -> egg;
- DUCK -> duck egg;
- GOOSE -> feather;
- TURKEY -> feather;
- RABBIT -> fluff;
- SHEEP -> wool;
- PIG -> truffle/rare find;
- GOAT -> milk;
- COW -> milk;
- CAMEL -> milk;
- PEACOCK -> feather;
- SWAN -> feather.

Компаньоны и экзотические животные могут давать XP, Coins, happiness bonus или rare-find reward за уход, вместо нелогичного продукта.

---

# 7. Локации

Полный список:

```text
MEADOW
BARNYARD
MAX_HOME
GARDEN
LAKESIDE
ORCHARD
DESERT
FOREST
LAKE
HILLS
VALLEY
```

Рекомендуемое распределение:

```text
MEADOW:
CHICK, CHICKEN, RABBIT, PEACOCK

BARNYARD:
TURKEY, PIG, GOAT, COW, BULL

MAX_HOME:
CAT, DOG

GARDEN:
основная производственная зона

LAKESIDE:
DUCK, GOOSE, SWAN

ORCHARD:
DONKEY, PEACOCK, совместимые GOAT

DESERT:
FENNEC, CAMEL

FOREST:
T_REX, TRICERATOPS, PTERODACTYL, DIPLODOCUS

LAKE:
DUCK, GOOSE, SWAN + fishing/water bonuses

HILLS:
SHEEP, GOAT, HORSE

VALLEY:
HORSE, DONKEY, COW, BULL и другие совместимые животные
```

Животное имеет preferred location и несколько compatible locations.

---

# 8. Работники

Полный roster:

```text
worker-papa      порядок и ласка животных
worker-mama      кормление голодных
worker-nadya     полив и сбор урожая
worker-lena      сбор продуктов
worker-pasha     чистка щёткой
worker-andrey    деревья
worker-dima      рыбалка
worker-arina     сортировка запасов
worker-sveta     хлеб/будущее производство
worker-misha     овцы и стрижка
worker-masha     падающие звёзды
worker-sergey    ремонт построек
worker-pastuh    возвращает животных в зоны/загоны
worker-kolya     рассада
worker-vera      полив
worker-fyodor    посадка
worker-sonya     сбор урожая
worker-grisha    полив
worker-nina      птицы
worker-olya      кролики
worker-vika      свинки
worker-igor      пустынные животные
worker-tolya     динозавры
worker-zoya      водоплавающие
worker-petya     зерно птицам
worker-roman     MAX_HOME и мебель
```

Работники должны постепенно полностью автоматизировать routine gameplay.

При этом активная игра остаётся полезной через:

- pet/toss;
- butterflies;
- shooting stars;
- rare finds;
- location interactions;
- развитие.

Использовать единый `TaskBoard`.

Worker state machine:

```text
IDLE
FIND_TASK
RESERVE_TASK
MOVE_TO_ANCHOR
WORK
COMPLETE_TASK
RETURN
REST
```

Одна задача может быть зарезервирована только одним работником.

Награда выдаётся только один раз.

---

# 9. GARDEN

Стартовые растения:

```text
WHEAT
CORN
CARROT
POTATO
TOMATO
CABBAGE
PUMPKIN
```

Plot state:

```text
EMPTY
PLANTED
NEEDS_WATER
GROWING
READY
```

Макс не обязан точно стоять над грядкой — interaction происходит через anchor.

Выращенные растения:

- идут на корм;
- идут в inventory;
- могут продаваться.

---

# 10. Единый Магазин

Постоянно видна одна большая понятная кнопка `Магазин`.

Все покупки только здесь.

Tabs:

```text
Locations
Animals
Workers
Tools
Upgrades
```

Не создавай отдельные магазины по разным сценам.

Market UI должен быть mobile bottom sheet.

---

# 11. UI

Постоянный HUD:

```text
Level + XP
Coins
Day/Night
Settings
```

Постоянный нижний navigation:

```text
Map
Market
Bag
```

Все остальные controls contextual.

Не перегружать сцену badges, counters и floating windows.

Одна крупная панель одновременно.

---

# 12. День и ночь

Day cycle — gameplay time, а не реальные сутки.

Фазы:

```text
DAWN
DAY
SUNSET
NIGHT
```

Продолжительность хранить в config.

DAY:

- flowers;
- butterflies;
- bright lighting.

NIGHT:

- blue/purple lighting overlay;
- lanterns;
- shooting stars;
- special night bonuses.

Ночь не блокирует основную игру.

---

# 13. Живой мир

## Flowers

Растут на predefined flower spawn points.

Готовый цветок можно нажать и получить небольшой bonus.

## Butterflies

Днём появляются по spawn budget.

Tap -> Coins + XP.

## Shooting Stars

Ночью пролетают ограниченное время.

Tap -> Coins + XP / rare bonus.

Masha после найма может автоматически собирать часть night events.

Не допускать бесконечного фарма.

---

# 14. Прогрессия

Основные ресурсы:

```text
Coins
XP
Level
```

На первом релизе не добавляй premium currency.

Level unlocks:

- Locations;
- Animals;
- Workers;
- Tools;
- Upgrades.

Покупка дополнительно требует Coins.

Каждая Location имеет upgrades, например:

```text
Capacity
Comfort
Production
Beauty
Automation
Storage
```

---

# 15. Сохранение

Используй versioned serializable save state.

Сохранять:

```text
schemaVersion
savedAt
playerLevel
xp
coins
inventory
locations
animals
animalNeeds
workers
workerAssignments
tools
upgrades
crops
gameTime
currentLocation
settings
```

Не сохранять Phaser objects.

Обязательные save triggers:

- purchase;
- unlock;
- important reward;
- important state change;
- debounced autosave;
- visibilitychange;
- pagehide.

Повреждённый save не должен блокировать запуск.

---

# 16. Техническая архитектура

Используй:

- Phaser;
- TypeScript strict;
- Vite;
- unit tests;
- Playwright для ключевых E2E.

Перед добавлением Phaser pin exact stable version и зафиксируй её в package lock.

Разделяй системы:

```text
GameState
CommandBus
EventBus
LocationSystem
MovementSystem
InteractionSystem
AnimalSystem
FarmSystem
WorkerSystem
TaskBoard
EconomySystem
ProgressionSystem
DayNightSystem
CollectibleSystem
AudioSystem
SaveSystem
AssetSystem
UIController
```

Никакая Phaser Scene не должна становиться главным store игры.

---

# 17. Performance

Mobile first.

Не делать:

- interval на каждое животное;
- interval на каждого работника;
- дорогой поиск задачи каждый frame;
- весь content загруженным одновременно;
- неочищаемые listeners;
- DOM gameplay entities.

Цель:

- 60 FPS на обычном современном mobile/tablet;
- корректное поведение около 30 FPS;
- simulation speed независима от FPS.

---

# 18. Как работать по ROADMAP

В каждый рабочий цикл:

1. найди первый незавершённый Stage в `ROADMAP.md`;
2. выбери маленький логически законченный milestone внутри него;
3. перед кодом прочитай связанные файлы;
4. реализуй только нужный scope;
5. добавь tests;
6. запусти typecheck/tests/build;
7. проверь touch/mobile implications;
8. обнови checkbox только если реально выполнено;
9. сделай небольшой тематический commit;
10. дай отчёт на русском.

Не пытайся за один проход реализовать сразу все 23 animals, 26 workers и 11 locations.

Сначала рабочая архитектура, затем content packs.

---

# 19. Первый запуск агента

При первом запуске после очистки проекта выполни только **Stage 0**, а затем начни **Stage 1** до первого реально работающего vertical slice.

Минимальный результат первого большого цикла:

```text
Phaser boot
MEADOW
Max
mobile tap-to-walk
camera
one AnimalZone
one CHICK
wander
animal drag
animal toss
settle/clamp
basic GameState
basic SaveRepository
build + typecheck + tests
```

Не начинай Garden, Shop, Workers и остальные animals до прохождения Stage 1 Gate.

---

# 20. Definition of Done

Нельзя объявлять задачу законченной, пока:

- действие работает пальцем;
- сущности остаются в валидных зонах;
- resize не ломает placement;
- FPS не меняет simulation speed;
- save/reload сохраняет нужный результат;
- reward/purchase не может сработать дважды;
- relevant test существует;
- build/typecheck/test реально запускались, если среда позволяет;
- нет несвязанных изменений.

---

# 21. Главный продуктовый принцип

**Сложность должна находиться внутри системы, а не в интерфейсе ребёнка.**

Ребёнок должен видеть:

- животное -> хочется потрогать;
- еду -> хочется покормить;
- грядку -> хочется посадить;
- бабочку -> хочется поймать;
- звезду -> хочется нажать;
- новый загон -> хочется открыть.

Архитектура, workers, save, economy, timers и automation должны работать под этим незаметно.
