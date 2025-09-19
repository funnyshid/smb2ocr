export const inputEmpty = () => ({
  up: false,
  right: false,
  down: false,
  left: false,
  a: false,
  b: false,
  start: false,
  select: false,
});
const keyboardMap = {
  ArrowUp: "up",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowLeft: "left",
  Enter: "start",
  k: "select",
  z: "b",
  x: "a",
};
export let input = inputEmpty();
export let inputPressed = inputEmpty();

function onKey(key, down) {
  const k = keyboardMap[key];
  if (k) {
    if (!input[k] && down) {
      inputPressed[k] = true;
    }
    input[k] = down;
    return true;
  }
  return false;
}

function onKeyDown(e) {
  if (onKey(e.key, true)) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}

function onKeyUp(e) {
  if (onKey(e.key, false)) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}

function onBlur() {
  input = inputEmpty();
  inputPressed = inputEmpty();
}

window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
window.addEventListener("blur", onBlur);
