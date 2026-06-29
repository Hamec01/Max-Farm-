import Phaser from "phaser";
import { STAGE1_ANIMAL_DEFS, STAGE1_ASSETS } from "../content";
import type { Stage1AnimalMood, Stage1AnimalSpecies } from "../types";

function buildBirdSvg(species: Stage1AnimalSpecies, mood: Stage1AnimalMood) {
  const definition = STAGE1_ANIMAL_DEFS[species];
  const fill = mood === "hungry" ? definition.tint.hungry : definition.tint.happy;
  const accent = definition.tint.accent;
  const eye = mood === "hungry" ? "#6a2d1d" : "#1d1d1d";
  const wing = mood === "hungry" ? "#ffffff44" : "#ffffff66";
  const crest = species === "TURKEY" ? `<circle cx="58" cy="18" r="7" fill="${accent}"/><circle cx="66" cy="14" r="5" fill="#f48f6b"/>` :
    species === "CHICKEN" ? `<path d="M58 18c8-9 18-8 18 2-7-2-12 0-18 6Z" fill="${accent}"/>` :
    species === "GOOSE" ? `<path d="M54 16c5-7 12-6 14 2-5-2-8-1-12 4Z" fill="${accent}"/>` :
    `<path d="M54 18c4-5 10-5 12 2-4-1-7 0-10 4Z" fill="${accent}"/>`;
  const tail = species === "TURKEY"
    ? `<path d="M18 48c-10-14-8-28 10-36 16 2 24 12 24 24-8-4-18-1-34 12Z" fill="${accent}" opacity="0.7"/>`
    : `<path d="M18 54c-12-10-11-23 4-31 8 2 13 7 16 15-6-2-12 0-20 16Z" fill="${accent}" opacity="0.55"/>`;
  const neck = species === "GOOSE"
    ? `<path d="M48 28c14-2 24 8 24 20-4 6-12 7-20 4 2-9-1-16-4-24Z" fill="${fill}"/>`
    : species === "DUCK"
      ? `<path d="M48 30c12-1 20 7 20 17-4 5-10 6-17 4 1-7-1-13-3-21Z" fill="${fill}"/>`
      : `<path d="M48 31c11-1 18 7 18 16-3 5-9 6-15 4 1-6-1-12-3-20Z" fill="${fill}"/>`;
  const beak = species === "GOOSE"
    ? `<path d="M76 46c12 2 18 6 18 12-8 2-15 1-22-2Z" fill="#ff9e4d"/>`
    : `<path d="M70 48c10 0 16 3 16 8-6 3-12 3-19 0Z" fill="#ffb24f"/>`;
  const bodyScale = species === "TURKEY" ? 1.08 : species === "GOOSE" ? 1.02 : 1;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 96 96">
      <ellipse cx="48" cy="86" rx="30" ry="7" fill="#00000022"/>
      ${tail}
      <ellipse cx="44" cy="52" rx="${28 * bodyScale}" ry="${22 * bodyScale}" fill="${fill}"/>
      <ellipse cx="40" cy="58" rx="15" ry="11" fill="${wing}"/>
      ${neck}
      <circle cx="62" cy="38" r="13" fill="${fill}"/>
      ${crest}
      <circle cx="66" cy="35" r="2.8" fill="${eye}"/>
      <path d="M60 42c4 4 8 4 12 0" stroke="${eye}" stroke-width="2.5" stroke-linecap="round"/>
      ${beak}
      <path d="M36 73v12M52 73v12" stroke="#b86d2f" stroke-width="4" stroke-linecap="round"/>
    </svg>
  `;
}

function svgToDataUri(svg: string) {
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    const { width, height } = this.scale;
    const label = this.add.text(width / 2, height / 2 - 32, "Loading Max-Farm Stage 2", {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "26px",
      color: "#f6f2d4",
    }).setOrigin(0.5);

    const progressBg = this.add.rectangle(width / 2, height / 2 + 18, Math.min(420, width - 40), 20, 0x1d2f25, 0.9).setOrigin(0.5);
    const progressBar = this.add.rectangle(progressBg.x - progressBg.width / 2, progressBg.y, 4, 14, 0xf1ca65, 1).setOrigin(0, 0.5);

    this.load.on("progress", (value: number) => {
      progressBar.width = Math.max(4, (progressBg.width - 6) * value);
      label.setText(`Loading Max-Farm Stage 2 ${Math.round(value * 100)}%`);
    });

    this.load.image("meadow-bg", STAGE1_ASSETS.meadowBackground);
    this.load.image("garden-bg", STAGE1_ASSETS.gardenBackground);
    this.load.image("max-idle", STAGE1_ASSETS.max);
    this.load.image("worker-mama", STAGE1_ASSETS.workerMama);

    for (const species of Object.keys(STAGE1_ANIMAL_DEFS) as Stage1AnimalSpecies[]) {
      this.load.svg(`bird-${species}-happy`, svgToDataUri(buildBirdSvg(species, "happy")));
      this.load.svg(`bird-${species}-hungry`, svgToDataUri(buildBirdSvg(species, "hungry")));
    }
  }

  create() {
    this.scene.start("WorldScene");
    this.scene.start("UIScene");
  }
}
