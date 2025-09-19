import { Game } from "./game/game.js";

document.getElementById("start-button").addEventListener("click", () => {
  document.getElementById("start-button").remove();

  const loginContainer = document.getElementById("login-container");

  const instruction = document.createElement("p");
  instruction.textContent = "Please dig letters into the sand to enter your name.";
  loginContainer.appendChild(instruction);

  const textOutput = document.createElement("div");
  textOutput.id = "text-output";
  textOutput.textContent = "???";
  loginContainer.appendChild(textOutput);

  const canvas = document.createElement("canvas");
  canvas.id = "gameCanvas";
  canvas.width = 528;
  canvas.height = 240;
  loginContainer.appendChild(canvas);

  const resetButton = document.createElement("button");
  resetButton.id = "reset-button";
  resetButton.className = "button";
  resetButton.textContent = "Reset";
  loginContainer.appendChild(resetButton);

  const submitButton = document.createElement("button");
  submitButton.id = "submit-button";
  submitButton.className = "button";
  submitButton.textContent = "Next";
  loginContainer.appendChild(submitButton);

  loginContainer.appendChild(document.createElement("br"));

  let game = new Game(canvas.id);
  game.start();
});
