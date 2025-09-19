import { TILES } from "./game.js";

const positiveSpaceCharacter = "_";
const negativeSpaceCharacter = "S";

export function textToImage(text) {
  // Make pixel size big enough that Tesseract can see it
  const pixelSize = 10;

  // Prepare lines: trim, split by new lines, remove spaces
  let lines = text
    .trim()
    .split("\n")
    .map((line) => line.replace(/\s+/g, ""));

  // Pad top and bottom with a solid negative line, so Tesseract doesn't get confused
  const padRow = negativeSpaceCharacter.repeat(lines[0].length);
  lines = [padRow, ...lines, padRow];

  // Pad left and right with two negative characters, so Tesseract doesn't get confused
  lines = lines.map((line) => negativeSpaceCharacter.repeat(2) + line + negativeSpaceCharacter.repeat(2));

  // Setup canvas of level text
  const canvas_with_text = document.createElement("canvas");
  canvas_with_text.style.imageRendering = "pixelated";
  canvas_with_text.width = lines[0].length * pixelSize;
  canvas_with_text.height = lines.length * pixelSize;

  const ctx = canvas_with_text.getContext("2d");

  // Fill background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas_with_text.width, canvas_with_text.height);

  // Draw positive space pixels
  ctx.fillStyle = "black";
  lines.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      if (line[x] === positiveSpaceCharacter) {
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  });

  return canvas_with_text;
}

export async function getTextFromImage(generatedCanvasWithText) {
  try {
    const result = await Tesseract.recognize(generatedCanvasWithText, "eng", {
      // logger: (m) => console.log(m),
    });

    if (!result.data.text || result.data.text.trim() === "") {
      return "???";
    }
    return result.data.text;
  } catch (error) {
    return "???";
  }
}
