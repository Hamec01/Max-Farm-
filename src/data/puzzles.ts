export interface PuzzleConfig {
  id: string;
  name: string;
  image: string;
  difficulties: number[];
}

/** Добавьте новую картинку сюда — игра сама нарежет её на 4 или 6 частей.
 *  Файлы кладите в public/assets/puzzles/custom/ и пропишите запись ниже. */
export const PUZZLE_CATALOG: PuzzleConfig[] = [
  {
    id: "puppy_01",
    name: "Щенок",
    image: "/assets/puzzles/custom/puppy_01.png",
    difficulties: [4, 6],
  },
  {
    id: "cow_01",
    name: "Коровка",
    image: "/assets/puzzles/custom/cow_01.png",
    difficulties: [4, 6],
  },
  {
    id: "lamb_01",
    name: "Ягнёнок",
    image: "/assets/puzzles/custom/lamb_01.png",
    difficulties: [4, 6],
  },
  {
    id: "ram_01",
    name: "Баран",
    image: "/assets/puzzles/custom/ram_01.png",
    difficulties: [4, 6],
  },
  {
    id: "goose_01",
    name: "Гусь",
    image: "/assets/puzzles/custom/goose_01.png",
    difficulties: [4, 6],
  },
  {
    id: "turkey_01",
    name: "Индюшка",
    image: "/assets/puzzles/custom/turkey_01.png",
    difficulties: [4, 6],
  },
  {
    id: "chicken_01",
    name: "Курочка",
    image: "/assets/puzzles/chicken_01.png",
    difficulties: [4, 6],
  },
  {
    id: "chick_01",
    name: "Цыплёнок",
    image: "/assets/puzzles/chick_01.png",
    difficulties: [4, 6],
  },
];

export function getGridForPieceCount(count: number): { cols: number; rows: number } {
  if (count === 4) return { cols: 2, rows: 2 };
  if (count === 6) return { cols: 3, rows: 2 };
  const cols = Math.ceil(Math.sqrt(count));
  return { cols, rows: Math.ceil(count / cols) };
}

/** Лай при сборке — только пазл со щенком/собакой */
export function isDogPuzzle(config: PuzzleConfig | null | undefined): boolean {
  if (!config) return false;
  return config.id === "puppy_01" || config.id.startsWith("puppy_") || config.id.includes("dog");
}

export function pickRandomPuzzle(): PuzzleConfig {
  return PUZZLE_CATALOG[Math.floor(Math.random() * PUZZLE_CATALOG.length)];
}

export function pickRandomPieceCount(config: PuzzleConfig): number {
  const options = config.difficulties;
  return options[Math.floor(Math.random() * options.length)];
}
