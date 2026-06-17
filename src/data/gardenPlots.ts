/** Огород: 3 ряда × 8 грядок — всё помещается на экране без прокрутки */
const GARDEN_COLS = 8;
const GARDEN_ROWS = 3;
const GARDEN_START_X = 16;
const GARDEN_END_X = 84;
export const GARDEN_ROW_Y = [54, 62, 70] as const;

function buildGardenPlotCoords(): Record<string, { x: number; y: number }> {
  const coords: Record<string, { x: number; y: number }> = {};
  for (let i = 0; i < GARDEN_COLS * GARDEN_ROWS; i++) {
    const col = i % GARDEN_COLS;
    const row = Math.floor(i / GARDEN_COLS);
    const x = GARDEN_START_X + (col / (GARDEN_COLS - 1)) * (GARDEN_END_X - GARDEN_START_X);
    coords[`plot${i + 1}`] = {
      x: Math.round(x * 10) / 10,
      y: GARDEN_ROW_Y[row],
    };
  }
  return coords;
}

export const GARDEN_PLOT_COORDS = buildGardenPlotCoords();
