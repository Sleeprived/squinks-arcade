/* Star Divers — baseline formation shooter: enemies hold a grid, peel off and
   dive. No capture. All behavior lives in the shared ShooterEngine; this file
   just wires the DOM and starts it with capture disabled. */

import { ShooterEngine } from "../../js/shooter.js";

const game = new ShooterEngine({
  canvas: document.getElementById("board"),
  key: "squinks.stardivers.best",
  capture: false,
  el: {
    score: document.getElementById("score"),
    best: document.getElementById("best"),
    lives: document.getElementById("lives"),
    wave: document.getElementById("wave"),
    over: document.getElementById("over"),
    overMsg: document.getElementById("over-msg"),
    again: document.getElementById("again"),
  },
});

document.getElementById("again").addEventListener("click", () => game.reset());
document.getElementById("pause").addEventListener("click", () => game.togglePause());
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Clear Star Divers high score?")) game.clearBest();
});
