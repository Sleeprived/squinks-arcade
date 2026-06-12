/* Twin Talon — the shooter engine with the capture mechanic enabled. A captor
   can tractor-beam the ship (capture costs a life immediately; last-life capture
   ends the game). Destroying a captor that carries the captive frees it into a
   dual fighter with doubled fire; a death while dual reverts to a single ship.
   All of that lives in ShooterEngine; this file only wires the DOM. */

import { ShooterEngine } from "../../js/shooter.js";

const game = new ShooterEngine({
  canvas: document.getElementById("board"),
  key: "squinks.twintalon.best",
  capture: true,
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
  if (confirm("Clear Twin Talon high score?")) game.clearBest();
});
