import type { LocationId } from "../types";
import { getZoneFlora } from "../data/zoneFlora";

interface GroundFoliageProps {
  zone: LocationId;
}

export function GroundFoliage({ zone }: GroundFoliageProps) {
  const flora = getZoneFlora(zone);
  if (!flora) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-0" id="ground-foliage-decor">
      {flora.trees.map((tree, i) => (
        <div key={`tree-${i}`} className={`absolute ${tree.sizeClass} filter drop-shadow-lg`} style={{ top: tree.top, left: tree.left }}>
          <span className="relative inline-block leading-none">
            {tree.emoji}
            {tree.fruits?.map((fruit, fi) => (
              <span
                key={fi}
                className="absolute text-[10px]"
                style={{
                  top: `${12 + fi * 10}px`,
                  left: fi % 2 === 0 ? `${8 + fi * 6}px` : undefined,
                  right: fi % 2 === 1 ? `${4 + fi * 4}px` : undefined,
                }}
              >
                {fruit}
              </span>
            ))}
          </span>
        </div>
      ))}

      {flora.bushes.map((bush, i) => (
        <div
          key={`bush-${i}`}
          className="absolute w-16 h-9 rounded-full bg-emerald-600/85 border-b-4 border-emerald-900/40 shadow-md"
          style={{ top: bush.top, left: bush.left }}
        >
          <div className="absolute -top-3 left-3 w-9 h-7 rounded-full bg-emerald-500/85" />
          <div className="absolute -top-2 right-2 w-7 h-6 rounded-full bg-emerald-500/80" />
          {bush.accent && <span className="absolute top-1 left-6 text-[10px]">{bush.accent}</span>}
        </div>
      ))}

      {flora.grass.map((tuft, i) => (
        <span
          key={`grass-${i}`}
          className="absolute text-lg opacity-70"
          style={{ top: tuft.top, left: tuft.left }}
        >
          {tuft.emoji}
        </span>
      ))}
    </div>
  );
}
