import { getGridForPieceCount } from "../../data/puzzles";

export interface GeneratedPuzzlePiece {
  id: string;
  row: number;
  col: number;
  srcX: number;
  srcY: number;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
}

export interface GeneratedPuzzle {
  image: HTMLImageElement;
  cols: number;
  rows: number;
  boardWidth: number;
  boardHeight: number;
  pieces: GeneratedPuzzlePiece[];
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generatePuzzleFromImage(
  imageSrc: string,
  pieceCount: number
): Promise<GeneratedPuzzle> {
  const image = await loadImage(imageSrc);
  const { cols, rows } = getGridForPieceCount(pieceCount);
  const boardWidth = image.naturalWidth;
  const boardHeight = image.naturalHeight;
  const pieceW = boardWidth / cols;
  const pieceH = boardHeight / rows;
  const pieces: GeneratedPuzzlePiece[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const srcX = col * pieceW;
      const srcY = row * pieceH;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(pieceW);
      canvas.height = Math.round(pieceH);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, srcX, srcY, pieceW, pieceH, 0, 0, canvas.width, canvas.height);
      pieces.push({
        id: `p-${row}-${col}`,
        row,
        col,
        srcX,
        srcY,
        width: canvas.width,
        height: canvas.height,
        canvas,
      });
    }
  }

  return { image, cols, rows, boardWidth, boardHeight, pieces };
}
