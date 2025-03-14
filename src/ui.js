// ui.js
/**
 * Creates and manages the vehicle control legend UI
 * @returns {Object} References to UI elements and update functions
 */
export function createVehicleControlsUI() {
    const commonNote = `<p><em>Switch vehicles with 1, 2, or 3.</em></p>`;
    const legends = {
      excavator: `
        <h3>Excavator Controls</h3>
        <ul style="list-style: none; padding: 0;">
          <li>W: Move Forward</li>
          <li>S: Move Backward</li>
          <li>A: Turn Left</li>
          <li>D: Turn Right</li>
          <li>Q/E: Rotate Turret</li>
          <li>R/F: Boom Up/Down</li>
          <li>T/G: Stick Extend/Retract</li>
          <li>Y/H: Bucket Curl</li>
          <li>Space: Dig</li>
        </ul>
        ${commonNote}
      `,
      dumpTruck: `
        <h3>Dump Truck Controls</h3>
        <ul style="list-style: none; padding: 0;">
          <li>Arrow Up/Down: Move</li>
          <li>Arrow Left/Right: Turn</li>
          <li>B/N: Tipper Up/Down</li>
        </ul>
        ${commonNote}
      `,
      snowPlow: `
        <h3>Snow Plow Controls</h3>
        <ul style="list-style: none; padding: 0;">
          <li>Arrow Up/Down: Move</li>
          <li>Arrow Left/Right: Turn</li>
          <li>Z/X: Blade Rotate</li>
          <li>V/C: Lift/Lower Assembly</li>
        </ul>
        ${commonNote}
      `
    };
  
    const legend = document.createElement('div');
    legend.style.position = 'absolute';
    legend.style.top = '10px';
    legend.style.left = '10px';
    legend.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    legend.style.color = 'white';
    legend.style.padding = '10px';
    legend.style.fontFamily = 'Arial, sans-serif';
    legend.style.fontSize = '14px';
    legend.innerHTML = legends.excavator;
    document.body.appendChild(legend);
  
    // Update function to change the legend based on vehicle type
    function updateLegend(vehicleType) {
      legend.innerHTML = legends[vehicleType];
    }
  
    return {
      element: legend,
      updateLegend,
      legends
    };
  }
  
  /**
   * Creates and manages the snow controls UI
   * @param {Function} onToggle - Callback for when snow is toggled
   * @param {Function} onRateChange - Callback for when accumulation rate changes
   * @returns {Object} References to UI elements and state
   */
  export function createSnowControlsUI(onToggle, onRateChange) {
    // Snow toggle button
    const snowToggleButton = document.createElement('button');
    snowToggleButton.innerHTML = "Enable Snow";
    snowToggleButton.style.position = 'absolute';
    snowToggleButton.style.top = '10px';
    snowToggleButton.style.right = '10px';
    snowToggleButton.style.padding = '10px';
    snowToggleButton.style.fontSize = '14px';
    document.body.appendChild(snowToggleButton);
  
    // Snow accumulation slider
    const accumulationSliderContainer = document.createElement('div');
    accumulationSliderContainer.style.position = 'absolute';
    accumulationSliderContainer.style.top = '50px';
    accumulationSliderContainer.style.right = '10px';
    accumulationSliderContainer.style.padding = '10px';
    accumulationSliderContainer.style.fontSize = '14px';
    accumulationSliderContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    accumulationSliderContainer.style.color = 'white';
    accumulationSliderContainer.innerHTML = `<label for="accumulationRate">Snow Speed:</label>
    <input id="accumulationRate" type="range" min="0" max="1" step="0.01" value="0.2" />`;
    document.body.appendChild(accumulationSliderContainer);
  
    let snowEnabled = false;
    let accumulationRate = 0.2;
  
    // Set up event listeners
    const accumulationSlider = document.getElementById('accumulationRate');
    accumulationSlider.addEventListener('input', (event) => {
      accumulationRate = parseFloat(event.target.value);
      if (onRateChange) onRateChange(accumulationRate);
    });
  
    snowToggleButton.addEventListener('click', () => {
      snowEnabled = !snowEnabled;
      if (onToggle) onToggle(snowEnabled);
      snowToggleButton.innerHTML = snowEnabled ? "Disable Snow" : "Enable Snow";
    });
  
    return {
      snowEnabled,
      accumulationRate,
      button: snowToggleButton,
      slider: accumulationSlider,
      container: accumulationSliderContainer
    };
  }