export type DrawingTool = "pencil" | "marker" | "brush" | "eraser";

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawStroke {
  tool: DrawingTool;
  color: string;
  points: DrawPoint[];
  /** Утолщение линии для пальца на телефоне */
  widthMul?: number;
}

export const DRAWING_COLORS = [
  "#000000", "#FFFFFF", "#EF4444", "#F97316", "#FACC15", "#84CC16",
  "#22C55E", "#14B8A6", "#3B82F6", "#6366F1", "#A855F7", "#EC4899",
  "#92400E", "#6B7280", "#F472B6", "#FDE047",
] as const;

export const TOOL_WIDTH: Record<DrawingTool, number> = {
  pencil: 4,
  marker: 12,
  brush: 28,
  eraser: 40,
};

export function getStrokeStyle(tool: DrawingTool, color: string): {
  strokeStyle: string;
  lineWidth: number;
  globalAlpha: number;
  composite: GlobalCompositeOperation;
} {
  if (tool === "eraser") {
    return { strokeStyle: "#000", lineWidth: TOOL_WIDTH.eraser, globalAlpha: 1, composite: "destination-out" };
  }
  if (tool === "brush") {
    return { strokeStyle: color, lineWidth: TOOL_WIDTH.brush, globalAlpha: 0.75, composite: "source-over" };
  }
  if (tool === "marker") {
    return { strokeStyle: color, lineWidth: TOOL_WIDTH.marker, globalAlpha: 1, composite: "source-over" };
  }
  return { strokeStyle: color, lineWidth: TOOL_WIDTH.pencil, globalAlpha: 1, composite: "source-over" };
}

export function drawStrokeOnContext(ctx: CanvasRenderingContext2D, stroke: DrawStroke) {
  if (stroke.points.length < 2) return;
  const style = getStrokeStyle(stroke.tool, stroke.color);
  ctx.save();
  ctx.globalCompositeOperation = style.composite;
  ctx.strokeStyle = style.strokeStyle;
  ctx.lineWidth = style.lineWidth * (stroke.widthMul ?? 1);
  ctx.globalAlpha = style.globalAlpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i++) {
    const prev = stroke.points[i - 1];
    const curr = stroke.points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
  }
  const last = stroke.points[stroke.points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
}

export function redrawAllStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: DrawStroke[],
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  strokes.forEach((s) => drawStrokeOnContext(ctx, s));
}

export function interpolatePoints(a: DrawPoint, b: DrawPoint, step: number): DrawPoint[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= step) return [b];
  const n = Math.ceil(dist / step);
  const pts: DrawPoint[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    pts.push({ x: a.x + dx * t, y: a.y + dy * t });
  }
  return pts;
}
