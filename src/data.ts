/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimalConfig, AnimalSpecies, CropConfig, CropType, TreeConfig, TreeType, LocationConfig, LocationId, PlayerState, FarmUpgrade, BuildingConfig } from "./types";
import { createInitialPenStates } from "./lib/penLogic";
import { normalizeLoadedDifficulty, allLocationIds } from "./lib/gameDifficulty";
import {
  MEADOW_GROUND_Y,
  clampWalkYForZone,
  MEADOW_BACKGROUND_SRC,
  BARNYARD_BACKGROUND_SRC,
  LAKESIDE_BACKGROUND_SRC,
  ORCHARD_BACKGROUND_SRC,
  DESERT_BACKGROUND_SRC,
} from "./lib/sceneLayout";
import { isInteriorZone } from "./data/locations";
import { DEFAULT_MAX_OUTFIT_ID, MAX_OUTFITS } from "./data/maxOutfits";

export const ANIMAL_TEMPLATES: Record<AnimalSpecies, AnimalConfig> = {
  [AnimalSpecies.CHICK]: {
    species: AnimalSpecies.CHICK,
    nameRu: "Цыплёнок Пи",
    emoji: "🐥",
    cost: 30,
    foodType: "WHEAT",
    foodNameRu: "Пшеница",
    productionTime: 15,
    productName: "Крошечное яйцо",
    productPrice: 10,
    productIcon: "🥚",
    description: "Маленький пушистый цыплёнок. Чирикает, когда голоден, и радостно машет крылышками после еды!",
    soundType: "chicken"
  },
  [AnimalSpecies.CHICKEN]: {
    species: AnimalSpecies.CHICKEN,
    nameRu: "Курица Коко",
    emoji: "🐔",
    cost: 50,
    foodType: "WHEAT",
    foodNameRu: "Пшеница",
    productionTime: 20,
    productName: "Яйцо",
    productPrice: 15,
    productIcon: "🥚",
    description: "Веселая курочка. Обожает клевать пшеницу и несет теплые золотистые яички!",
    soundType: "chicken"
  },
  [AnimalSpecies.DUCK]: {
    species: AnimalSpecies.DUCK,
    nameRu: "Утка Кряква",
    emoji: "🦆",
    cost: 90,
    foodType: "WHEAT",
    foodNameRu: "Пшеница",
    productionTime: 30,
    productName: "Утиное яйцо",
    productPrice: 30,
    productIcon: "🥚",
    description: "Любит плавать в воде и крякать. Дает крупные утиные яйца.",
    soundType: "duck"
  },
  [AnimalSpecies.GOOSE]: {
    species: AnimalSpecies.GOOSE,
    nameRu: "Гусь Гага",
    emoji: "🪿",
    cost: 150,
    foodType: "WHEAT",
    foodNameRu: "Пшеница",
    productionTime: 45,
    productName: "Гусиное перо",
    productPrice: 55,
    productIcon: "🪶",
    description: "Гордый белый гусь. Дает мягкие белые перья для теплых подушек.",
    soundType: "goose"
  },
  [AnimalSpecies.TURKEY]: {
    species: AnimalSpecies.TURKEY,
    nameRu: "Индюшка Болтушка",
    emoji: "🦃",
    cost: 220,
    foodType: "WHEAT",
    foodNameRu: "Пшеница",
    productionTime: 60,
    productName: "Индюшачье перо",
    productPrice: 90,
    productIcon: "🪶",
    description: "Распускает свой веерный хвост и забавно болбочет. Дает пышные перья.",
    soundType: "turkey"
  },
  [AnimalSpecies.RABBIT]: {
    species: AnimalSpecies.RABBIT,
    nameRu: "Кролик Банни",
    emoji: "🐇",
    cost: 300,
    foodType: "CARROT",
    foodNameRu: "Морковь",
    productionTime: 40,
    productName: "Кроличий пух",
    productPrice: 130,
    productIcon: "☁️",
    description: "Милый пушистик с длинными ушками. Обожает хрустеть сладкой морковкой.",
    soundType: "rabbit"
  },
  [AnimalSpecies.SHEEP]: {
    species: AnimalSpecies.SHEEP,
    nameRu: "Овечка Кудряшка",
    emoji: "🐑",
    cost: 450,
    foodType: "CLOVER",
    foodNameRu: "Клевер",
    productionTime: 50,
    productName: "Овечья шерсть",
    productPrice: 200,
    productIcon: "🧶",
    description: "Подари ей клевер! После стрижки становится временно лысой и розовой, пока шерстка не отрастет назад.",
    soundType: "sheep"
  },
  [AnimalSpecies.PIG]: {
    species: AnimalSpecies.PIG,
    nameRu: "Свинка Хрюша",
    emoji: "🐷",
    cost: 650,
    foodType: "CARROT",
    foodNameRu: "Морковь",
    productionTime: 70,
    productName: "Трюфель",
    productPrice: 320,
    productIcon: "🍄",
    description: "Любит похрюкать и покопаться в грязи своим милым пятачком. Находит под землей ценные трюфели!",
    soundType: "pig"
  },
  [AnimalSpecies.GOAT]: {
    species: AnimalSpecies.GOAT,
    nameRu: "Козочка Дереза",
    emoji: "🐐",
    cost: 850,
    foodType: "CABBAGE",
    foodNameRu: "Капуста",
    productionTime: 80,
    productName: "Козье молоко",
    productPrice: 420,
    productIcon: "🥛",
    description: "Озорная девица с рожками и бородкой. Дает наивкуснейшее диетическое молоко.",
    soundType: "goat"
  },
  [AnimalSpecies.COW]: {
    species: AnimalSpecies.COW,
    nameRu: "Корова Бурёнка",
    emoji: "🐄",
    cost: 1200,
    foodType: "CLOVER",
    foodNameRu: "Клевер",
    productionTime: 90,
    productName: "Парное молоко",
    productPrice: 600,
    productIcon: "🥛",
    description: "Спокойная и добрая коровка. Жует травку и клевер под звучное «Му-у-у!» и дает парное молоко.",
    soundType: "cow"
  },
  [AnimalSpecies.DONKEY]: {
    species: AnimalSpecies.DONKEY,
    nameRu: "Ослик Иа",
    emoji: "🫏",
    cost: 1600,
    foodType: "APPLE",
    foodNameRu: "Спелое яблоко",
    productionTime: 110,
    productName: "Подкова удачи",
    productPrice: 850,
    productIcon: "horseshoe",
    description: "Славный ушастый ослик. Любит яблочки и дарит подковы на счастье.",
    soundType: "donkey"
  },
  [AnimalSpecies.HORSE]: {
    species: AnimalSpecies.HORSE,
    nameRu: "Лошадка Орлик",
    emoji: "🐎",
    cost: 2500,
    foodType: "APPLE",
    foodNameRu: "Спелое яблоко",
    productionTime: 130,
    productName: "Золотая подкова",
    productPrice: 1400,
    productIcon: "👑",
    description: "Быстрый скакун с красивой гривой. Горделивый красавец, который обожает сочные яблоки.",
    soundType: "horse"
  },
  [AnimalSpecies.BULL]: {
    species: AnimalSpecies.BULL,
    nameRu: "Бык Буян",
    emoji: "🦬",
    cost: 4000,
    foodType: "CLOVER",
    foodNameRu: "Клевер",
    productionTime: 160,
    productName: "Золотой бубенчик",
    productPrice: 2200,
    productIcon: "🔔",
    description: "Сильный и мужественный бык с колечком в носу. Очень заботливый, дарит золотой бубенчик.",
    soundType: "bull"
  },
  [AnimalSpecies.CAT]: {
    species: AnimalSpecies.CAT,
    nameRu: "Кот Мурзик",
    emoji: "🐱",
    cost: 400,
    foodType: "MILK",
    foodNameRu: "Молоко",
    productionTime: 50,
    productName: "Игрушечная мышка",
    productPrice: 180,
    productIcon: "🐭",
    description: "Ласковый пушистый кот. Ловит хитрых мышей и мурчит, когда его гладишь.",
    soundType: "cat"
  },
  [AnimalSpecies.DOG]: {
    species: AnimalSpecies.DOG,
    nameRu: "Пес Рекс",
    emoji: "🐶",
    cost: 500,
    foodType: "MILK",
    foodNameRu: "Молоко", // Can feed milk or general harvests
    productionTime: 60,
    productName: "Косточка дружбы",
    productPrice: 250,
    productIcon: "🦴",
    description: "Преданный защитник нашей фермы. Весело виляет хвостом и оберегает всех животных от скуки.",
    soundType: "dog"
  },
  [AnimalSpecies.T_REX]: {
    species: AnimalSpecies.T_REX,
    nameRu: "Тираннозавр Рекс",
    emoji: "🦖",
    cost: 6500,
    foodType: "CABBAGE",
    foodNameRu: "Капуста",
    productionTime: 180,
    productName: "Юрский рубин",
    productPrice: 3500,
    productIcon: "💎",
    description: "Настоящий грозный король динозавров! Но этот малыш очень дружелюбный и безумно любит свежую сочную капусту.",
    soundType: "dino"
  },
  [AnimalSpecies.TRICERATOPS]: {
    species: AnimalSpecies.TRICERATOPS,
    nameRu: "Трицератопс Трикси",
    emoji: "🦕",
    cost: 8500,
    foodType: "CLOVER",
    foodNameRu: "Клевер",
    productionTime: 220,
    productName: "Древний изумруд",
    productPrice: 4800,
    productIcon: "💚",
    description: "Огромный трехрогий динозавр с шикарным воротником. Обожает лакомиться нежным кудрявым клевером.",
    soundType: "dino"
  },
  [AnimalSpecies.PTERODACTYL]: {
    species: AnimalSpecies.PTERODACTYL,
    nameRu: "Птеродактиль Пип",
    emoji: "🦅",
    cost: 11000,
    foodType: "CHERRY",
    foodNameRu: "Спелая вишня",
    productionTime: 260,
    productName: "Доисторическое перо",
    productPrice: 6200,
    productIcon: "🪶",
    description: "Летающий гигантский ящер. Обожает кружить над фермой и кушать сочные спелые вишенки.",
    soundType: "dino"
  },
  [AnimalSpecies.DIPLODOCUS]: {
    species: AnimalSpecies.DIPLODOCUS,
    nameRu: "Диплодок Долли",
    emoji: "🦕",
    cost: 15000,
    foodType: "APPLE",
    foodNameRu: "Спелое яблоко",
    productionTime: 300,
    productName: "Золотое яйцо динозавра",
    productPrice: 8500,
    productIcon: "🥚",
    description: "Дружелюбный великан с невероятно длинной шеей. Способен дотянуться до самых верхних яблок в саду!",
    soundType: "dino"
  },
  [AnimalSpecies.FENNEC]: {
    species: AnimalSpecies.FENNEC,
    nameRu: "Фенёк Шустрик",
    emoji: "🦊",
    cost: 3200,
    foodType: "RASPBERRY_BUSH",
    foodNameRu: "Малина",
    productionTime: 100,
    productName: "Пустынный Аметист",
    productPrice: 1800,
    productIcon: "💜",
    description: "Песчаный фенёк с огромными ушками. Обожает спелую сладкую малину!",
    soundType: "dog"
  },
  [AnimalSpecies.CAMEL]: {
    species: AnimalSpecies.CAMEL,
    nameRu: "Верблюд Гоша",
    emoji: "🐫",
    cost: 5800,
    foodType: "BLUEBERRY_BUSH",
    foodNameRu: "Черника",
    productionTime: 140,
    productName: "Дюнный Янтарь",
    productPrice: 3200,
    productIcon: "💛",
    description: "Двугорбый сильный верблюд. С радостью жует полезную чернику в пустыне.",
    soundType: "donkey"
  },
  [AnimalSpecies.PEACOCK]: {
    species: AnimalSpecies.PEACOCK,
    nameRu: "Павлин Павлик",
    emoji: "🦚",
    cost: 480,
    foodType: "WHEAT",
    foodNameRu: "Пшеница",
    productionTime: 55,
    productName: "Павлинье перо",
    productPrice: 120,
    productIcon: "🪶",
    description: "Гордый павлин с радужным хвостом. Любит клевать зёрнышки и дарит красивые перья!",
    soundType: "turkey"
  },
  [AnimalSpecies.SWAN]: {
    species: AnimalSpecies.SWAN,
    nameRu: "Лебедь Снежок",
    emoji: "🦢",
    cost: 380,
    foodType: "CLOVER",
    foodNameRu: "Клевер",
    productionTime: 50,
    productName: "Лебединое перо",
    productPrice: 95,
    productIcon: "🪶",
    description: "Белоснежный лебедь у пруда. Обожает клевер и дарит пушистые перья.",
    soundType: "goose"
  }
};

export const CROPS_CONFIG: Record<CropType, CropConfig> = {
  WHEAT: {
    type: "WHEAT",
    nameRu: "Пшеница",
    seedCost: 5,
    growTime: 12,
    yieldCount: 2,
    sellPrice: 8,
    icon: "🌾"
  },
  CARROT: {
    type: "CARROT",
    nameRu: "Морковь",
    seedCost: 10,
    growTime: 25,
    yieldCount: 2,
    sellPrice: 18,
    icon: "🥕"
  },
  CLOVER: {
    type: "CLOVER",
    nameRu: "Клевер",
    seedCost: 18,
    growTime: 40,
    yieldCount: 2,
    sellPrice: 32,
    icon: "☘️"
  },
  CABBAGE: {
    type: "CABBAGE",
    nameRu: "Капуста",
    seedCost: 28,
    growTime: 60,
    yieldCount: 2,
    sellPrice: 50,
    icon: "🥬"
  },
  RASPBERRY_BUSH: {
    type: "RASPBERRY_BUSH",
    nameRu: "Куст Малины",
    seedCost: 40,
    growTime: 80,
    yieldCount: 2,
    sellPrice: 95,
    icon: "🍓"
  },
  BLUEBERRY_BUSH: {
    type: "BLUEBERRY_BUSH",
    nameRu: "Куст Черники",
    seedCost: 65,
    growTime: 110,
    yieldCount: 3,
    sellPrice: 155,
    icon: "🫐"
  }
};

export const TREES_CONFIG: Record<TreeType, TreeConfig> = {
  APPLE: {
    type: "APPLE",
    nameRu: "Яблоня",
    cost: 180,
    growTime: 80,
    yieldCount: 3,
    fruitSellPrice: 50,
    fruitNameRu: "Яблоко",
    icon: "🌳"
  },
  CHERRY: {
    type: "CHERRY",
    nameRu: "Вишня",
    cost: 350,
    growTime: 120,
    yieldCount: 4,
    fruitSellPrice: 80,
    fruitNameRu: "Вишня",
    icon: "🍒"
  }
};

export const LOCATIONS: Record<LocationId, LocationConfig> = {
  MEADOW: {
    id: "MEADOW",
    nameRu: "Цветущий Луг",
    description: "Просторная зеленая поляна, наполненная цветами. Идеально подходит для кур, уток, кроликов и овечек.",
    unlockCost: 0,
    isUnlocked: true,
    bgGradient: "from-emerald-100 to-green-200",
    backgroundImage: MEADOW_BACKGROUND_SRC,
    minLevel: 1
  },
  BARNYARD: {
    id: "BARNYARD",
    nameRu: "Уютный Загон",
    description: "Просторная территория с деревянным забором, сарайчиком и теплым сеном для крупных животных.",
    unlockCost: 0,
    isUnlocked: true,
    bgGradient: "from-amber-50 to-orange-100/80",
    backgroundImage: BARNYARD_BACKGROUND_SRC,
    minLevel: 1
  },
  MAX_HOME: {
    id: "MAX_HOME",
    nameRu: "Дом Макса",
    description: "Уютная комната Макса: кроватка, игрушки, рисунки на стене и место для кошки и собаки!",
    unlockCost: 0,
    isUnlocked: true,
    bgGradient: "from-amber-100 to-orange-200",
    minLevel: 1
  },
  GARDEN: {
    id: "GARDEN",
    nameRu: "Большой Огород",
    description: "Уютный огород: 24 грядки в три ряда — всё видно на одном экране!",
    unlockCost: 0,
    isUnlocked: true,
    bgGradient: "from-lime-100 to-emerald-200",
    minLevel: 1
  },
  LAKESIDE: {
    id: "LAKESIDE",
    nameRu: "Утиный Пруд",
    description: "Живописная локация у прохладного озера с камышами. Здесь обожают шумно плавать гуси, утки и козочки.",
    unlockCost: 1200,
    isUnlocked: false,
    bgGradient: "from-sky-100 to-blue-200",
    backgroundImage: LAKESIDE_BACKGROUND_SRC,
    minLevel: 4
  },
  ORCHARD: {
    id: "ORCHARD",
    nameRu: "Фруктовый Сад",
    description: "Разработанная плодородная почва, идеально подходящая для посадки раскидистых яблонь и вишневых деревьев.",
    unlockCost: 3000,
    isUnlocked: false,
    bgGradient: "from-teal-50 to-emerald-100",
    backgroundImage: ORCHARD_BACKGROUND_SRC,
    minLevel: 6
  },
  DESERT: {
    id: "DESERT",
    nameRu: "Солнечная Пустыня",
    description: "Экзотический песчаный оазис с теплыми дюнами и кактусами. Идеально для теплолюбивых зверей.",
    unlockCost: 5000,
    isUnlocked: false,
    bgGradient: "from-amber-200 to-yellow-100",
    backgroundImage: DESERT_BACKGROUND_SRC,
    minLevel: 8
  },
  FOREST: {
    id: "FOREST",
    nameRu: "Таинственный Лес",
    description: "Уютная лесная опушка, окруженная вековыми соснами и спелой земляникой. Отличное место для динозавров и лесных питомцев.",
    unlockCost: 8000,
    isUnlocked: false,
    bgGradient: "from-emerald-200 to-green-150",
    minLevel: 10
  },
  LAKE: {
    id: "LAKE",
    nameRu: "Глубокое Озеро",
    description: "Огромное синее озеро с живописным деревянным причалом. Здесь в прозрачной воде весело плавают и резвятся рыбки!",
    unlockCost: 12000,
    isUnlocked: false,
    bgGradient: "from-sky-200 to-indigo-100",
    minLevel: 12
  },
  HILLS: {
    id: "HILLS",
    nameRu: "Ветреные Холмы",
    description: "Высокие зелёные холмы с панорамным видом на ферму. Идеально для лошадей, овечек и павлинов.",
    unlockCost: 15000,
    isUnlocked: false,
    bgGradient: "from-lime-100 to-emerald-200",
    minLevel: 14
  },
  VALLEY: {
    id: "VALLEY",
    nameRu: "Луговая Долина",
    description: "Широкая солнечная долина с ручьём и цветами — простор для всех семей зверушек!",
    unlockCost: 18000,
    isUnlocked: false,
    bgGradient: "from-green-100 to-teal-100",
    minLevel: 16
  }
};

export const UPGRADES: Record<string, FarmUpgrade> = {
  brushTool: {
    id: "brushTool",
    nameRu: "Мягкая Щётка",
    description: "Быстрее чистит животных и поднимает им настроение на 30% больше при поглаживании.",
    cost: 150,
    level: 1,
    maxLevel: 5,
    multiplier: 1.25,
    icon: "🧹"
  },
  autoFeeder: {
    id: "autoFeeder",
    nameRu: "Сверх-Питание",
    description: "Увеличивает питательную ценность ухода. Время сытости животных длится дольше на 20% с каждым уровнем.",
    cost: 300,
    level: 1,
    maxLevel: 5,
    multiplier: 1.20,
    icon: "🌾"
  },
  goldenSpade: {
    id: "goldenSpade",
    nameRu: "Золотая Лопатка",
    description: "Растения в огороде подрастают на 15% быстрее благодаря качественной золотой обработке земли.",
    cost: 250,
    level: 1,
    maxLevel: 5,
    multiplier: 1.15,
    icon: "coin"
  },
  marketContract: {
    id: "marketContract",
    nameRu: "Выгодная Сделка",
    description: "Максим торгует с улыбкой! Дает +10% к цене продажи всех продуктов на городском рынке.",
    cost: 500,
    level: 1,
    maxLevel: 5,
    multiplier: 1.10,
    icon: "📈"
  },
  dripIrrigation: {
    id: "dripIrrigation",
    nameRu: "Капельный Полив",
    description: "Шланг с капельницами сам поливает до 2 сухих грядок за уровень каждую секунду на огороде.",
    cost: 280,
    level: 0,
    maxLevel: 3,
    multiplier: 1.0,
    icon: "💧"
  },
  richCompost: {
    id: "richCompost",
    nameRu: "Компостная Куча",
    description: "Плодородный компост даёт +1 урожай с каждой собранной грядки за уровень (до +2).",
    cost: 350,
    level: 0,
    maxLevel: 2,
    multiplier: 1.0,
    icon: "🪴"
  },
  gardenGreenhouse: {
    id: "gardenGreenhouse",
    nameRu: "Теплица",
    description: "Под стеклянной крышей растения созревают на 12% быстрее за каждый уровень.",
    cost: 420,
    level: 0,
    maxLevel: 4,
    multiplier: 1.12,
    icon: "🏡"
  }
};

export const WORKER_DESCRIPTIONS: Record<string, string> = {
  "worker-papa": "Наводит порядок на ферме и гладит зверушек — поднимает им настроение!",
  "worker-mama": "Кормит голодных зверушек в своей зоне и ездит на другие локации, если нужно.",
  "worker-nadya": "Поливает сухие грядки, сажает семена и собирает спелый урожай.",
  "worker-lena": "Собирает продукты у животных, яблоки и вишни с деревьев.",
  "worker-pasha": "Чистит животных мягкой щёткой и поднимает им настроение.",
  "worker-andrey": "Ухаживает за яблонями и вишнями — ускоряет созревание плодов.",
  "worker-dima": "Ловит рыбок у озера и приносит монетки на ферму.",
  "worker-arina": "Сортирует запасы на складе и помогает получать больше опыта.",
  "worker-sveta": "Печёт вкусный хлеб из пшеницы и продаёт его на рынке.",
  "worker-misha": "Пасёт овечек в лесу и помогает их стричь, когда шерсть готова.",
  "worker-masha": "Ночью находит падающие звёзды и приносит монетки.",
  "worker-sergey": "Чинит постройки и помогает дедушке Андрею в саду.",
  "worker-pastuh": "Загоняет зверушек в загон и подкармливает голодных на лугу.",
  "worker-kolya": "Помогает бабушке Наде — поливает дополнительные грядки и ухаживает за рассадой.",
  "worker-vera": "Поливает сухие грядки на огороде — отличный помощник с лейкой!",
  "worker-fyodor": "Сажает нужные семена на пустые грядки — знает, чем кормить зверушек.",
  "worker-sonya": "Собирает спелый урожай с грядок и складывает в рюкзак.",
  "worker-grisha": "Юный поливальщик — бегает между рядками и не даёт растениям засохнуть.",
  "worker-nina": "Кормит птиц, собирает яйца и перья — ездит туда, где нужна помощь.",
  "worker-olya": "Ухаживает за кроликами — кормит и собирает пушистые подарки.",
  "worker-vika": "Кормит свинок, чистит их и собирает продукцию.",
  "worker-igor": "Пасёт фенеков и верблюдов в пустыне, приносит монетки с оазиса.",
  "worker-tolya": "Гладит динозавров и поднимает им настроение в лесу.",
  "worker-zoya": "Кормит уток, гусей и лебедей у воды и собирает перья.",
  "worker-petya": "Помогает кормить птиц на разных локациях — быстро разносит зерно.",
  "worker-roman": "Живёт в доме Макса бесплатно: открывает магазин мебели и радует питомцев.",
};

export const INITIAL_STATE: PlayerState = {
  difficulty: "hard",
  coins: 100, // Start with ample budget to acquire first animal + seeds
  level: 1,
  experience: 0,
  activeLocation: "MEADOW",
  inventory: {
    // Starting items
    WHEAT_SEED: 4,
    CARROT_SEED: 2,
    WHEAT: 2, // starting food
    CLOVER: 1,
  },
  animals: [
    {
      id: "init-chick",
      species: AnimalSpecies.CHICK,
      customName: "Цыпа",
      isFed: false,
      fedTimeRemaining: 0,
      productionProgress: 0,
      happiness: 80,
      cleanliness: 90,
      x: 35,
      y: MEADOW_GROUND_Y,
      scaleX: 1,
      locationId: "MEADOW"
    }
  ],
  crops: {
    plot1: { id: "plot1", type: "WHEAT", progress: 0, isWatered: false, isDead: false, timeRemaining: 0 },
    plot2: { id: "plot2", type: "CARROT", progress: 0, isWatered: false, isDead: false, timeRemaining: 0 },
    plot3: { id: "plot3", type: "WHEAT", progress: 0, isWatered: false, isDead: false, timeRemaining: 0 },
    plot4: { id: "plot4", type: "CLOVER", progress: 0, isWatered: false, isDead: false, timeRemaining: 0 },
  },
  trees: {
    treePlot1: { id: "treePlot1", type: "APPLE", fruitProgress: 0, fruitCount: 0, timeRemaining: 80 },
    treePlot2: { id: "treePlot2", type: "CHERRY", fruitProgress: 0, fruitCount: 0, timeRemaining: 120 }
  },
  unlockedLocations: ["MEADOW", "BARNYARD", "GARDEN", "MAX_HOME"],
  upgrades: {
    brushTool: 1,
    autoFeeder: 1,
    goldenSpade: 1,
    marketContract: 1,
    dripIrrigation: 0,
    richCompost: 0,
    gardenGreenhouse: 0,
  },
  stats: {
    totalCoinsEarned: 100,
    animalsPetted: 0,
    productsCollected: 0,
    cropsHarvested: 0,
    animalsFed: 0
  },
  workers: [
    {
      id: "worker-papa",
      name: "Папа Андрей",
      emoji: "👨🏼‍🦱",
      roleRu: "Главный Строитель",
      dailyWage: 50,
      isActive: false,
      color: "from-blue-500 to-indigo-600",
      statusText: "Занимается делами (наведите порядок, косит газон и пилит доски)",
      assignedLocationId: "MEADOW"
    },
    {
      id: "worker-mama",
      name: "Мама Женя",
      emoji: "👩🏼‍🍳",
      roleRu: "Заботливая Кормилица",
      dailyWage: 40,
      isActive: false,
      color: "from-pink-400 to-rose-500",
      statusText: "Стряпает лакомства (кормит голодных животных)",
      assignedLocationId: "BARNYARD"
    },
    {
      id: "worker-nadya",
      name: "Бабушка Надя",
      emoji: "👵🏻",
      roleRu: "Мудрая Садовница",
      dailyWage: 45,
      isActive: false,
      color: "from-emerald-400 to-teal-500",
      statusText: "Готовит рассаду (поливает сухие грядки и сажает пшеницу)",
      assignedLocationId: "GARDEN"
    },
    {
      id: "worker-lena",
      name: "Бабушка Лена",
      emoji: "👵🏼",
      roleRu: "Добрая Собирательница",
      dailyWage: 35,
      isActive: false,
      color: "from-amber-400 to-yellow-600",
      statusText: "Прядёт пряжу (собирает спелые овощи и стрижёт овечек в хлев)",
      assignedLocationId: "BARNYARD"
    },
    {
      id: "worker-pasha",
      name: "Дедушка Паша",
      emoji: "👴🏼",
      roleRu: "Заботливый Ветеринар",
      dailyWage: 30,
      isActive: false,
      color: "from-teal-400 to-cyan-500",
      statusText: "Гладит зверей (чистит животных мягкой щёточкой)",
      assignedLocationId: "MEADOW"
    },
    {
      id: "worker-andrey",
      name: "Дедушка Андрей",
      emoji: "👴🏽",
      roleRu: "Смотритель Сада",
      dailyWage: 42,
      isActive: false,
      color: "from-green-500 to-emerald-600",
      statusText: "Ухаживает за деревьями (собирает яблоки и вишни)",
      assignedLocationId: "ORCHARD"
    },
    {
      id: "worker-dima",
      name: "Дядя Дима",
      emoji: "🧔🏻‍♂️",
      roleRu: "Озерный Рыбак",
      dailyWage: 38,
      isActive: false,
      color: "from-indigo-400 to-blue-500",
      statusText: "Чинит лодку (ловит золотых рыбок у реки)",
      assignedLocationId: "LAKESIDE"
    },
    {
      id: "worker-arina",
      name: "Тётя Арина",
      emoji: "👩🏻‍💼",
      roleRu: "Помощник-Кладовщик",
      dailyWage: 25,
      isActive: false,
      color: "from-fuchsia-400 to-pink-500",
      statusText: "Сортирует запасы (увеличивает опыт и сохраняет улов)",
      assignedLocationId: "LAKESIDE"
    },
    {
      id: "worker-sveta",
      name: "Тётя Света",
      emoji: "👩🏻",
      roleRu: "Весёлая Пекарь",
      dailyWage: 32,
      isActive: false,
      color: "from-orange-400 to-red-400",
      statusText: "Печёт хлеб из пшеницы и продаёт его на рынке",
      assignedLocationId: "DESERT"
    },
    {
      id: "worker-misha",
      name: "Дядя Марк",
      emoji: "👦🏻",
      roleRu: "Лесной Пастух",
      dailyWage: 28,
      isActive: false,
      color: "from-lime-400 to-green-500",
      statusText: "Пасёт овечек в лесу и помогает их стричь",
      assignedLocationId: "FOREST"
    },
    {
      id: "worker-masha",
      name: "Тётя Катя",
      emoji: "👵🏽",
      roleRu: "Ночная Звездочёт",
      dailyWage: 36,
      isActive: false,
      color: "from-violet-400 to-purple-500",
      statusText: "Ночью находит падающие звёзды и приносит монетки",
      assignedLocationId: "LAKE"
    },
    {
      id: "worker-sergey",
      name: "Дядя Денис",
      emoji: "🧑🏻‍🔧",
      roleRu: "Мастер на все руки",
      dailyWage: 44,
      isActive: false,
      color: "from-stone-400 to-slate-500",
      statusText: "Чинит постройки и помогает дедушке с деревьями",
      assignedLocationId: "ORCHARD"
    },
    {
      id: "worker-pastuh",
      name: "Пастух Ваня",
      emoji: "🤠",
      roleRu: "Смотритель Загонов",
      dailyWage: 36,
      isActive: false,
      color: "from-amber-500 to-yellow-600",
      statusText: "Загоняет зверушек обратно в огороженные дворики",
      assignedLocationId: "MEADOW"
    },
    {
      id: "worker-kolya",
      name: "Артём Иванов",
      emoji: "👦",
      roleRu: "Юный Садовник",
      dailyWage: 22,
      isActive: false,
      color: "from-lime-500 to-green-600",
      statusText: "Поливает дополнительные грядки на огороде",
      assignedLocationId: "GARDEN"
    },
    {
      id: "worker-vera",
      name: "Тётя Яна",
      emoji: "👩‍🌾",
      roleRu: "Поливальщица",
      dailyWage: 26,
      isActive: false,
      color: "from-sky-400 to-cyan-500",
      statusText: "Поливает сухие грядки лейкой",
      assignedLocationId: "GARDEN"
    },
    {
      id: "worker-fyodor",
      name: "Дядя деда Дима",
      emoji: "👴",
      roleRu: "Сеятель",
      dailyWage: 32,
      isActive: false,
      color: "from-amber-500 to-orange-600",
      statusText: "Сажает семена на пустые грядки",
      assignedLocationId: "GARDEN"
    },
    {
      id: "worker-sonya",
      name: "Сонечка",
      emoji: "👧",
      roleRu: "Сборщица Урожая",
      dailyWage: 28,
      isActive: false,
      color: "from-yellow-400 to-amber-500",
      statusText: "Собирает спелые овощи с грядок",
      assignedLocationId: "GARDEN"
    },
    {
      id: "worker-grisha",
      name: "Гришка",
      emoji: "🧒",
      roleRu: "Огородник",
      dailyWage: 24,
      isActive: false,
      color: "from-green-400 to-lime-500",
      statusText: "Помогает поливать дальние рядки",
      assignedLocationId: "GARDEN"
    },
    {
      id: "worker-nina",
      name: "Тётя Диана",
      emoji: "👩‍🌾",
      roleRu: "Хозяйка Курятника",
      dailyWage: 28,
      isActive: false,
      color: "from-rose-400 to-pink-500",
      statusText: "Кормит птиц, собирает яйца и следит за курятником",
      assignedLocationId: "MEADOW"
    },
    {
      id: "worker-petya",
      name: "Дядя Гламурный Дима",
      emoji: "👦",
      roleRu: "Помощник Птичника",
      dailyWage: 22,
      isActive: false,
      color: "from-yellow-300 to-amber-400",
      statusText: "Разносит зерно цыплятам и курам на всех локациях",
      assignedLocationId: "BARNYARD"
    },
    {
      id: "worker-olya",
      name: "Вассилиса",
      emoji: "👧",
      roleRu: "Кроличья Няня",
      dailyWage: 24,
      isActive: false,
      color: "from-pink-300 to-rose-400",
      statusText: "Кормит кроликов и собирает пушистые сюрпризы",
      assignedLocationId: "MEADOW"
    },
    {
      id: "worker-vika",
      name: "Вика Свинарка",
      emoji: "👩",
      roleRu: "Хозяйка Свинарника",
      dailyWage: 30,
      isActive: false,
      color: "from-orange-300 to-amber-500",
      statusText: "Чистит свинок и собирает их продукцию",
      assignedLocationId: "BARNYARD"
    },
    {
      id: "worker-igor",
      name: "Куликов",
      emoji: "🧔",
      roleRu: "Хранитель Пустыни",
      dailyWage: 34,
      isActive: false,
      color: "from-yellow-500 to-amber-600",
      statusText: "Ухаживает за фенеками и верблюдами в оазисе",
      assignedLocationId: "DESERT"
    },
    {
      id: "worker-tolya",
      name: "Влад",
      emoji: "👨‍🔬",
      roleRu: "Палеонтолог",
      dailyWage: 40,
      isActive: false,
      color: "from-emerald-500 to-teal-600",
      statusText: "Гладит динозавров и следит за их настроением",
      assignedLocationId: "FOREST"
    },
    {
      id: "worker-zoya",
      name: "Зоя Лебедь",
      emoji: "👩‍🦰",
      roleRu: "Хранительница Озера",
      dailyWage: 32,
      isActive: false,
      color: "from-sky-300 to-blue-400",
      statusText: "Кормит лебедей и собирает перья у воды",
      assignedLocationId: "LAKE"
    },
    {
      id: "worker-roman",
      name: "Роман Домовой",
      emoji: "🧹",
      roleRu: "Домовой в доме Макса",
      dailyWage: 0,
      isActive: true,
      isBundledWithHome: true,
      color: "from-amber-300 to-orange-400",
      statusText: "Живёт в доме Макса — продаёт мебель и убирается",
      assignedLocationId: "MAX_HOME"
    }
  ],
  pens: createInitialPenStates(),
  buildings: {
    MEADOW: ["max_house"],
    BARNYARD: [],
    MAX_HOME: [],
    GARDEN: [],
    LAKESIDE: [],
    ORCHARD: [],
    DESERT: [],
    FOREST: [],
    LAKE: [],
    HILLS: [],
    VALLEY: []
  },
  maxOutfits: [],
  activeMaxOutfit: "default",
};

export const BUILDINGS_TEMPLATES: Record<LocationId, BuildingConfig[]> = {
  MEADOW: [
    {
      id: "barnyard_house",
      nameRu: "Деревянный Ангар",
      emoji: "🛖",
      cost: 200,
      minLevel: 1,
      description: "Уютный бревенчатый домик для цыплят и уток.",
      benefitRu: "Снижает падение сытости птиц на 15%",
      x: 75,
      y: 42
    },
    {
      id: "meadow_mill",
      nameRu: "Ветряная Мельница",
      emoji: "🌾",
      cost: 500,
      minLevel: 2,
      description: "Красивая классическая мельница, перемалывающая зерно.",
      benefitRu: "Дает на 15% больше опыта при сборе урожая",
      x: 18,
      y: 45
    }
  ],
  BARNYARD: [
    {
      id: "pig_sty",
      nameRu: "Уютный Хлев",
      emoji: "🏡",
      cost: 650,
      minLevel: 3,
      description: "Просторный загон с чистым сухим сеном.",
      benefitRu: "Снижает скорость загрязнения свинок и овечек на 20%",
      x: 82,
      y: 42
    },
    {
      id: "max_house",
      nameRu: "Дом Макса",
      emoji: "🏡",
      cost: 500,
      minLevel: 2,
      description: "Собственный дом Макса. Тут будут жить и веселиться его Кошка и Собака!",
      benefitRu: "Дает дом питомцам. Повышает весь доход и опыт фермы на 30%!",
      x: 22,
      y: 42
    }
  ],
  GARDEN: [
    {
      id: "garden_scarecrow",
      nameRu: "Пугало",
      emoji: "🧑‍🌾",
      cost: 180,
      minLevel: 2,
      description: "Доброе пугало охраняет грядки от вредителей.",
      benefitRu: "Грядки не засыхают, если забыли полить",
      x: 18,
      y: 42
    },
    {
      id: "garden_well",
      nameRu: "Колодец",
      emoji: "🪣",
      cost: 320,
      minLevel: 3,
      description: "Свежая вода для полива всего огорода.",
      benefitRu: "Полив грядок даёт +5 XP",
      x: 32,
      y: 44
    },
    {
      id: "garden_shed",
      nameRu: "Сарай Огородника",
      emoji: "🏚️",
      cost: 550,
      minLevel: 4,
      description: "Тут хранятся лопатки, грабли и мешки с семенами.",
      benefitRu: "Семена при сборе урожая +1 бесплатно",
      x: 78,
      y: 44
    },
    {
      id: "garden_autowater",
      nameRu: "Система Автополива",
      emoji: "💦",
      cost: 420,
      minLevel: 2,
      description: "Дождевальные форсунки по всему огороду — вода льётся сама!",
      benefitRu: "Автоматически поливает до 5 сухих грядок каждую секунду",
      x: 52,
      y: 40
    }
  ],
  LAKESIDE: [
    {
      id: "lakeside_pavilion",
      nameRu: "Беседка у Пруда",
      emoji: "🛖",
      cost: 800,
      minLevel: 4,
      description: "Уютная беседка для отдыха у озера.",
      benefitRu: "Дает +10% к счастью всех животных на локации.",
      x: 15,
      y: 48
    }
  ],
  ORCHARD: [
    {
      id: "greenhouse",
      nameRu: "Стеклянная Теплица",
      emoji: "🏛️",
      cost: 1100,
      minLevel: 5,
      description: "Светлая теплица для нежных экзотических ягод.",
      benefitRu: "Ускоряет производство яблок и вишни на 20%",
      x: 80,
      y: 43
    }
  ],
  DESERT: [
    {
      id: "desert_oasis",
      nameRu: "Оазис Камелей",
      emoji: "🌴",
      cost: 1500,
      minLevel: 6,
      description: "Зеленый уголок с тенью и запасами чистой воды.",
      benefitRu: "Увеличивает скорость производства у верблюдов на 20%",
      x: 20,
      y: 44
    }
  ],
  FOREST: [
    {
      id: "ranger_hut",
      nameRu: "Лесная Сторожка",
      emoji: "🛖",
      cost: 1800,
      minLevel: 7,
      description: "Избушка лесничего Максима для лесных обитателей.",
      benefitRu: "Увеличивает ценность лесных продуктов на 15%",
      x: 75,
      y: 44
    }
  ],
  LAKE: [
    {
      id: "lighthouse",
      nameRu: "Детский Маяк",
      emoji: "🚨",
      cost: 2200,
      minLevel: 8,
      description: "Красивый сигнальный маяк для подсветки глубин.",
      benefitRu: "Дает +25% ускорения при движении рыб водных глубин!",
      x: 83,
      y: 40
    }
  ],
  MAX_HOME: [],
  HILLS: [
    {
      id: "hills_windmill",
      nameRu: "Холмистая Мельница",
      emoji: "🌬️",
      cost: 2400,
      minLevel: 14,
      description: "Ветряная мельница на вершине холма.",
      benefitRu: "Овечки на холмах производят шерсть на 15% быстрее",
      x: 20,
      y: 42
    }
  ],
  VALLEY: [
    {
      id: "valley_bridge",
      nameRu: "Каменный Мостик",
      emoji: "🌉",
      cost: 2800,
      minLevel: 16,
      description: "Красивый мост через ручей в долине.",
      benefitRu: "Все животные в долине получают +12 к счастью",
      x: 50,
      y: 48
    }
  ]
};

/** Безопасно загружает сохранение — не падает на битых данных в localStorage */
export function loadSavedGameState(): PlayerState {
  const fallback = (): PlayerState => ({
    ...INITIAL_STATE,
    workers: INITIAL_STATE.workers?.map((w) => ({ ...w })),
    pens: createInitialPenStates(),
  });

  try {
    const saved = localStorage.getItem("maxim_fermer_save");
    if (!saved) return fallback();

    const parsed = JSON.parse(saved) as Partial<PlayerState>;
    const difficulty = normalizeLoadedDifficulty(parsed);
    const normalizedAnimals = (Array.isArray(parsed.animals) ? parsed.animals : [...INITIAL_STATE.animals]).map((animal) => {
      if (!animal || typeof animal !== "object") return animal;
      const loc = ((animal as { locationId?: LocationId }).locationId || "MEADOW") as LocationId;
      if (isInteriorZone(loc)) return animal;
      const base = animal as { y?: number; groundY?: number; targetY?: number };
      const y = clampWalkYForZone(loc, typeof base.y === "number" ? base.y : MEADOW_GROUND_Y);
      return {
        ...animal,
        y,
        groundY: clampWalkYForZone(loc, typeof base.groundY === "number" ? base.groundY : y),
        targetY: clampWalkYForZone(loc, typeof base.targetY === "number" ? base.targetY : y),
      };
    });

    let workers = INITIAL_STATE.workers!.map((w) => ({ ...w }));
    if (Array.isArray(parsed.workers) && parsed.workers.length > 0) {
      const savedById = new Map(
        parsed.workers
          .filter((w) => !!w && typeof (w as { id?: string }).id === "string")
          .map((w) => [(w as { id: string; isActive?: boolean }).id, w as { id: string; isActive?: boolean }])
      );
      workers = INITIAL_STATE.workers!.map((template) => {
        if (template.isBundledWithHome) {
          return { ...template, isActive: true };
        }
        const savedWorker = savedById.get(template.id);
        const base = savedWorker
          ? {
              ...template,
              isActive: savedWorker.isActive ?? false,
              statusText: savedWorker.isActive ? "Помогает ухаживать за фермой" : template.statusText,
            }
          : { ...template };
        if (difficulty === "normal") {
          return { ...base, dailyWage: 0, isActive: savedWorker?.isActive ?? true };
        }
        return base;
      });
    }

    return {
      ...INITIAL_STATE,
      ...parsed,
      difficulty,
      coins: typeof parsed.coins === "number" ? parsed.coins : INITIAL_STATE.coins,
      level: typeof parsed.level === "number" ? parsed.level : INITIAL_STATE.level,
      experience: typeof parsed.experience === "number" ? parsed.experience : INITIAL_STATE.experience,
      activeLocation: parsed.activeLocation ?? INITIAL_STATE.activeLocation,
      inventory: parsed.inventory && typeof parsed.inventory === "object" ? parsed.inventory : { ...INITIAL_STATE.inventory },
      animals: normalizedAnimals,
      crops: parsed.crops && typeof parsed.crops === "object" ? parsed.crops : { ...INITIAL_STATE.crops },
      trees: parsed.trees && typeof parsed.trees === "object" ? parsed.trees : { ...INITIAL_STATE.trees },
      unlockedLocations: (() => {
        if (difficulty === "normal") return allLocationIds();
        const locs = Array.isArray(parsed.unlockedLocations)
          ? [...parsed.unlockedLocations]
          : [...INITIAL_STATE.unlockedLocations];
        if (!locs.includes("BARNYARD")) locs.push("BARNYARD");
        if (!locs.includes("GARDEN")) locs.push("GARDEN");
        if (!locs.includes("MAX_HOME")) locs.push("MAX_HOME");
        return locs;
      })(),
      upgrades: parsed.upgrades && typeof parsed.upgrades === "object"
        ? { ...INITIAL_STATE.upgrades, ...parsed.upgrades }
        : { ...INITIAL_STATE.upgrades },
      stats: parsed.stats && typeof parsed.stats === "object" ? { ...INITIAL_STATE.stats, ...parsed.stats } : { ...INITIAL_STATE.stats },
      buildings: (() => {
        const base: Record<string, string[]> = parsed.buildings && typeof parsed.buildings === "object"
          ? {
              ...INITIAL_STATE.buildings,
              ...parsed.buildings,
              GARDEN: parsed.buildings.GARDEN ?? [],
              MAX_HOME: parsed.buildings.MAX_HOME ?? [],
              HILLS: parsed.buildings.HILLS ?? [],
              VALLEY: parsed.buildings.VALLEY ?? [],
            }
          : { ...INITIAL_STATE.buildings };
        const meadow = base.MEADOW ?? [];
        if (!meadow.includes("max_house")) {
          base.MEADOW = [...meadow, "max_house"];
        }
        return base;
      })(),
      workers,
      pens: (() => {
        const defaults = createInitialPenStates();
        if (!Array.isArray(parsed.pens) || parsed.pens.length === 0) return defaults;
        const savedById = new Map(
          parsed.pens
            .filter((p) => !!p && typeof (p as { templateId?: string }).templateId === "string")
            .map((p) => [(p as { templateId: string }).templateId, p as { templateId: string; isOwned?: boolean; isOpen?: boolean }])
        );
        return defaults.map((template) => {
          const saved = savedById.get(template.templateId);
          if (!saved) return { ...template };
          return {
            ...template,
            isOwned: saved.isOwned ?? false,
            isOpen: saved.isOpen ?? true,
          };
        });
      })(),
      maxOutfits: (() => {
        const valid = new Set(
          MAX_OUTFITS.map((o) => o.id).filter((id) => id !== DEFAULT_MAX_OUTFIT_ID)
        );
        if (!Array.isArray(parsed.maxOutfits)) return [...(INITIAL_STATE.maxOutfits ?? [])];
        return parsed.maxOutfits.filter(
          (id: unknown): id is string => typeof id === "string" && valid.has(id)
        );
      })(),
      activeMaxOutfit: (() => {
        const id = parsed.activeMaxOutfit;
        if (typeof id !== "string") return DEFAULT_MAX_OUTFIT_ID;
        return MAX_OUTFITS.some((o) => o.id === id) ? id : DEFAULT_MAX_OUTFIT_ID;
      })(),
      day: typeof parsed.day === "number" ? parsed.day : 1,
      dayProgress: typeof parsed.dayProgress === "number" ? parsed.dayProgress : 0,
    };
  } catch {
    return fallback();
  }
}
