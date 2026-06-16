/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimalConfig, AnimalSpecies, CropConfig, CropType, TreeConfig, TreeType, LocationConfig, LocationId, PlayerState, FarmUpgrade, BuildingConfig } from "./types";

export const ANIMAL_TEMPLATES: Record<AnimalSpecies, AnimalConfig> = {
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
    productIcon: "🪙",
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
    minLevel: 1
  },
  BARNYARD: {
    id: "BARNYARD",
    nameRu: "Уютный Загон",
    description: "Просторная территория с деревянным забором, деревянным сарайчиком и теплым сеном для крупных животных.",
    unlockCost: 400,
    isUnlocked: false,
    bgGradient: "from-amber-50 to-orange-100/80",
    minLevel: 2
  },
  LAKESIDE: {
    id: "LAKESIDE",
    nameRu: "Утиный Пруд",
    description: "Живописная локация у прохладного озера с камышами. Здесь обожают шумно плавать гуси, утки и козочки.",
    unlockCost: 1200,
    isUnlocked: false,
    bgGradient: "from-sky-100 to-blue-200",
    minLevel: 4
  },
  ORCHARD: {
    id: "ORCHARD",
    nameRu: "Фруктовый Сад",
    description: "Разработанная плодородная почва, идеально подходящая для посадки раскидистых яблонь и вишневых деревьев.",
    unlockCost: 3000,
    isUnlocked: false,
    bgGradient: "from-teal-50 to-emerald-100",
    minLevel: 6
  },
  DESERT: {
    id: "DESERT",
    nameRu: "Солнечная Пустыня",
    description: "Экзотический песчаный оазис с теплыми дюнами и кактусами. Идеально для теплолюбивых зверей.",
    unlockCost: 5000,
    isUnlocked: false,
    bgGradient: "from-amber-200 to-yellow-100",
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
    icon: "🪙"
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
  }
};

export const INITIAL_STATE: PlayerState = {
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
      id: "init-chicken",
      species: AnimalSpecies.CHICKEN,
      customName: "Цыпа",
      isFed: false,
      fedTimeRemaining: 0,
      productionProgress: 0,
      happiness: 80,
      cleanliness: 90,
      x: 35,
      y: 60,
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
  unlockedLocations: ["MEADOW"],
  upgrades: {
    brushTool: 1,
    autoFeeder: 1,
    goldenSpade: 1,
    marketContract: 1
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
      emoji: "🧔🏽‍♂️",
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
      assignedLocationId: "BARNYARD"
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
    }
  ],
  buildings: {
    MEADOW: [],
    BARNYARD: [],
    LAKESIDE: [],
    ORCHARD: [],
    DESERT: [],
    FOREST: [],
    LAKE: []
  }
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
  LAKESIDE: [
    {
      id: "fishing_pier",
      nameRu: "Рыбацкий Пирс",
      emoji: "🎣",
      cost: 800,
      minLevel: 4,
      description: "Уютный деревянный пирс со снастями для улова у озера.",
      benefitRu: "Увеличивает плотность рыбного косяка в заводи на 25%",
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
  ]
};
