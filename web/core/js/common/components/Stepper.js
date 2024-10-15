class StepperComponent {
    constructor(config, workflow) {
        // console.log("StepperComponent config:", config);
        this.container = document.getElementById(config.id);
        if (!this.container) {
            console.error("Container not found:", config.id);
            return;
        }
        this.config = config;
        this.workflow = workflow;
        this.setupStepper();
        this.createStepper();
        this.initializeUI();
    }

    setupStepper() {
        this.minValue = this.config.minValue;
        this.maxValue = this.config.maxValue;
        this.step = this.config.step;
        this.precision = this.config.precision !== undefined ? this.config.precision : 2;
        this.scaleFactor = this.config.scaleFactor !== undefined ? this.config.scaleFactor : Math.pow(10, this.precision);
        this.value = parseFloat(this.config.defValue.toFixed(this.precision));
    }

    createStepper() {
        const html = `
            <span class="${this.config.id}Label" for="${this.config.id}Input">${this.config.label}</span>
            <input type="range" class="range-input" id="${this.config.id}SliderInput" 
                min="${this.minValue * this.scaleFactor}" 
                max="${this.maxValue * this.scaleFactor}" 
                step="${this.step * this.scaleFactor}" 
                value="${this.value * this.scaleFactor}">
            <input type="number" class="text-input" id="${this.config.id}Input" 
                value="${this.value.toFixed(this.precision)}">
            <button id="${this.config.id}DecrementButton">-</button>
            <button id="${this.config.id}IncrementButton">+</button>
        `;
        this.container.innerHTML = html;

        this.inputElement = document.getElementById(`${this.config.id}Input`);
        this.decrementButton = document.getElementById(`${this.config.id}DecrementButton`);
        this.incrementButton = document.getElementById(`${this.config.id}IncrementButton`);
        this.sliderElement = document.getElementById(`${this.config.id}SliderInput`);

        this.attachEventListeners();
    }

    initializeUI() {
        this.updateDisplay();
        this.updateExternalConfig();
    }

    updateValue(newValue) {
        const scaledValue = parseFloat(newValue);
        if (scaledValue >= this.minValue && scaledValue <= this.maxValue) {
            this.value = parseFloat(scaledValue.toFixed(this.precision));
            this.updateDisplay();
            this.updateExternalConfig();
        }
    }

    updateDisplay() {
        this.inputElement.value = this.value.toFixed(this.precision);
        this.sliderElement.value = parseFloat(this.value) * this.scaleFactor;
    }

    updateExternalConfig() {
        const path = this.config.nodePath;
        const pathParts = path.split(".");
        let target = this.workflow;
        for (let i = 0; i < pathParts.length - 1; i++) {
            target = target[pathParts[i]] = target[pathParts[i]] || {};
        }
        target[pathParts[pathParts.length - 1]] = parseFloat(this.value);
    }

    increment() {
        this.updateValue(parseFloat(this.value) + this.step);
    }

    decrement() {
        this.updateValue(parseFloat(this.value) - this.step);
    }

    attachEventListeners() {
        this.incrementButton.addEventListener('click', () => this.increment());
        this.decrementButton.addEventListener('click', () => this.decrement());
        this.sliderElement.addEventListener('input', () => {
            this.updateValue(this.sliderElement.value / this.scaleFactor);
        });
        this.inputElement.addEventListener('input', () => {
            this.updateValue(this.inputElement.value);
        });
    }
}

export default StepperComponent;
