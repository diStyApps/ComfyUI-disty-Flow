class InputComponent {

    constructor(config, workflow) {
        this.container = document.getElementById(config.id);
        if (!this.container) {
            console.error("Container not found:", config.id);
            return;
        }

        this.config = config;
        this.workflow = workflow;
        this.setupInput();
        this.createInput();
        this.initializeUI();
    }

    setupInput() {
        this.type = this.config.type || 'text';
        this.defaultValue = this.config.defValue !== undefined ? this.config.defValue : '';
        this.placeholder = this.config.placeholder || '';
        this.value = this.defaultValue;
    }

    createInput() {
        const html = `
            <label for="${this.config.id}Input" class="${this.config.id}Label">${this.config.label}</label>
            <input 
                type="${this.type}" 
                class="text-input" 
                id="${this.config.id}Input" 
                value="${this.escapeHtml(this.value)}" 
                placeholder="${this.escapeHtml(this.placeholder)}"
            >
        `;
        this.container.innerHTML = html;

        this.inputElement = document.getElementById(`${this.config.id}Input`);
        this.labelElement = document.getElementById(`${this.config.id}Label`);

        this.attachEventListeners();
    }

    initializeUI() {
        this.updateDisplay();
        this.updateExternalConfig();
    }

    updateValue(newValue) {
        this.value = newValue;
        this.updateDisplay();
        this.updateExternalConfig();
    }

    updateDisplay() {
        if (this.inputElement) {
            this.inputElement.value = this.value;
        }
    }

    updateExternalConfig() {
        if (!this.config.nodePath) {
            console.warn("nodePath is not defined in config for InputComponent:", this.config.id);
            return;
        }

        const pathParts = this.config.nodePath.split(".");
        let target = this.workflow;
        for (let i = 0; i < pathParts.length - 1; i++) {
            target = target[pathParts[i]] = target[pathParts[i]] || {};
        }
        target[pathParts[pathParts.length - 1]] = this.value;
    }

    attachEventListeners() {
        if (this.inputElement) {
            this.inputElement.addEventListener('input', (event) => {
                this.updateValue(event.target.value);
            });
        }
    }

    escapeHtml(unsafe) {
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

export default InputComponent;
