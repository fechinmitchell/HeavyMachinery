// InputManager.js
export class InputManager {
    constructor() {
      this.keys = {};
      window.addEventListener('keydown', (e) => {
        this.keys[e.key.toLowerCase()] = true;
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.key.toLowerCase()] = false;
      });
    }
    
    isKeyPressed(key) {
      return !!this.keys[key.toLowerCase()];
    }
    
    // Optionally, add a method to clear keys or to update state.
    update() {
      // Here you can process accumulated input events if needed.
    }
  }
  