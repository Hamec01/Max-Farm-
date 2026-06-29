import Phaser from "phaser";
import { createStage1GameConfig } from "./gameConfig";
import { stage1Session } from "./session";

let game: Phaser.Game | null = null;
let lifecycleBound = false;

function bindLifecycle() {
  if (lifecycleBound || typeof window === "undefined") {
    return;
  }
  lifecycleBound = true;

  const save = () => stage1Session.save();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      save();
      if (game) {
        game.loop.sleep();
      }
      return;
    }

    if (game) {
      game.loop.wake();
    }
  });

  window.addEventListener("pagehide", save);
  window.addEventListener("beforeunload", save);
  window.addEventListener("resize", save);
  window.addEventListener("orientationchange", save);
}

export function mountStage1Game() {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }

  root.innerHTML = '<div class="stage1-shell" id="stage1-shell"></div>';
  const shell = document.getElementById("stage1-shell");
  if (!shell) {
    throw new Error("Stage 1 shell not created");
  }

  bindLifecycle();
  game = new Phaser.Game(createStage1GameConfig(shell));
  (
    window as typeof window & {
      __stage1Game?: Phaser.Game;
      __stage1Session?: typeof stage1Session;
    }
  ).__stage1Game = game;
  (
    window as typeof window & {
      __stage1Game?: Phaser.Game;
      __stage1Session?: typeof stage1Session;
    }
  ).__stage1Session = stage1Session;
}
