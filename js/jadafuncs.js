const focusButton = document.getElementById("focusButton");
let gameFocused = false;




/*
  Toggles whether the game has keyboard focus.
  When focused, movement keys will not scroll the page.
*/
focusButton.addEventListener("click", () => {

    gameFocused = !gameFocused;
  
    if (gameFocused) {
        focusButton.textContent = "Release Game";
        focusButton.classList.add("active");
      } else {
        focusButton.textContent = "Focus Game";
        focusButton.classList.remove("active");
      }
  
  });

  /*
  Tracks key presses and allows machine purchasing with E.
  Prevents page scrolling when the game is focused.
*/
window.addEventListener("keydown", (e) => {

    if (!gameFocused) return;
  
    if (
      ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)
    ) {
      e.preventDefault();
    }
  
    keys[e.key] = true;
  
    if (e.key === "e" || e.key === "E") {
      buyHoveredMachine();
    }
  });
  
  /*
    Removes keys from the active key list when released.
  */
  window.addEventListener("keyup", (e) => {
  
    if (!gameFocused) return;
  
    keys[e.key] = false;
  
  });