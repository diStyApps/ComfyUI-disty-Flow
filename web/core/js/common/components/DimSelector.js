import { updateWorkflow } from './workflowManager.js';

class DimensionSelector {
    constructor(config = {}, workflow) {
        this.id = config.id;
        this.workflow = workflow;
        this.currentSelection = 'Custom';
        this.config = {
            defaultWidth: 1216,
            defaultHeight: 832,
            minDimension: 32,
            maxDimension: 4096,
            step: 16,
            aspectRatios: [
                { value: 'Custom', label: 'Custom' },
                { value: 'SD1.5', label: 'SD1.5' },
                { value: '512x512', label: '1:1 square 512x512' },
                { value: '1024x1024', label: '1:1 square 1024x1024' },
                { value: '512x768', label: '2:3 portrait 512x768' },
                { value: '512x682', label: '3:4 portrait 512x682' },
                { value: '768x512', label: '3:2 landscape 768x512' },
                { value: '682x512', label: '4:3 landscape 682x512' },
                { value: '910x512', label: '16:9 cinema 910x512' },
                { value: '952x512', label: '1.85:1 cinema 952x512' },
                { value: '1024x512', label: '2:1 cinema 1024x512' },
                { value: '1224x512', label: '2.39:1 anamorphic 1224x512' },
                { value: 'SDXL', label: 'SDXL' },
                { value: '1024x1024', label: '1:1 square 1024x1024' },
                { value: '896x1152', label: '3:4 portrait 896x1152' },
                { value: '832x1216', label: '5:8 portrait 832x1216' },
                { value: '768x1344', label: '9:16 portrait 768x1344' },
                { value: '640x1536', label: '9:21 portrait 640x1536' },
                { value: '1152x896', label: '4:3 landscape 1152x896' },
                { value: '1216x832', label: '3:2 landscape 1216x832' },
                { value: '1344x768', label: '16:9 landscape 1344x768' },
                { value: '1536x640', label: '21:9 landscape 1536x640' },
            ],
            nodePath : config.nodePath,
            ...config
        };
        this.config.defaultWidth = config.defaultWidth || 1216;
        this.config.defaultHeight = config.defaultHeight || 832;

        this.initializeComponent();
    }

    initializeComponent() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.renderComponent());
        } else {
            this.renderComponent();
        }
    }

    renderComponent() {
        this.container = document.getElementById(this.id);
        if (this.container) {
            this.render();
            this.attachEventListeners();
            this.updateWorkflowWithCurrentDimensions();
        } else {
            console.warn(`Container with id "${this.id}" not found. Retrying in 500ms.`);
            setTimeout(() => this.renderComponent(), 500);
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="dimension-selector-container">
                <div id="dimension-selector">
                    <div class="dimension-stepper" data-dimension="width">
                        <label for="width-input">Width</label>
                        <div class="stepper">
                            <button class="stepper__button" data-action="decrease" data-target="width-input">-</button>
                            <input class="stepper__input" type="number" value="${this.config.defaultWidth}" id="width-input" name="width" min="${this.config.minDimension}" max="${this.config.maxDimension}" step="${this.config.step}">
                            <button class="stepper__button" data-action="increase" data-target="width-input">+</button>
                        </div>
                    </div>
                    <button class="swap-btn" id="swap-btn">↔</button>
                    <div class="dimension-stepper" data-dimension="height">
                        <label for="height-input">Height</label>
                        <div class="stepper">
                            <button class="stepper__button" data-action="decrease" data-target="height-input">-</button>
                            <input class="stepper__input" type="number" value="${this.config.defaultHeight}" id="height-input" name="height" min="${this.config.minDimension}" max="${this.config.maxDimension}" step="${this.config.step}">
                            <button class="stepper__button" data-action="increase" data-target="height-input">+</button>
                        </div>
                    </div>
                </div>
                <div class="aspect-ratio-selector">
                    <select class="aspect-ratio-selector__select" id="aspect-ratio-selector">
                        ${this.config.aspectRatios.map(ratio => `<option value="${ratio.value}">${ratio.label}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        const widthInput = document.getElementById('width-input');
        const heightInput = document.getElementById('height-input');
        const swapBtn = document.getElementById('swap-btn');
        const aspectRatioSelector = document.getElementById('aspect-ratio-selector');

        this.container.querySelectorAll('.stepper__button').forEach(button => {
            button.addEventListener('click', this.handleStepperClick.bind(this));
        });

        widthInput.addEventListener('change', this.handleInputChange.bind(this));
        heightInput.addEventListener('change', this.handleInputChange.bind(this));
        swapBtn.addEventListener('click', this.handleSwap.bind(this));
        aspectRatioSelector.addEventListener('change', this.handleAspectRatioChange.bind(this));
    }

    handleStepperClick(event) {
        const targetInput = document.getElementById(event.target.dataset.target);
        const change = event.target.dataset.action === 'increase' ? 1 : -1;
        this.updateInputValue(targetInput, change);
    }

    handleInputChange(event) {
        const dimension = event.target.name;
        const value = parseInt(event.target.value, 10);
        this.updateWorkflowDimension(dimension, value);
        this.currentSelection = 'Custom';
        document.getElementById('aspect-ratio-selector').value = 'Custom';
    }

    handleSwap() {
        const widthInput = document.getElementById('width-input');
        const heightInput = document.getElementById('height-input');
        [widthInput.value, heightInput.value] = [heightInput.value, widthInput.value];
        this.updateWorkflowWithCurrentDimensions();
        this.currentSelection = 'Custom';
        document.getElementById('aspect-ratio-selector').value = 'Custom';
    }

    handleAspectRatioChange(event) {
        const value = event.target.value;
        this.currentSelection = value;

        if (value === 'Custom') {
            this.updateWorkflowWithCurrentDimensions();
        } else {
            const [width, height] = value.split('x').map(Number);
            this.updateWorkflowDimension('width', width);
            this.updateWorkflowDimension('height', height);
        }
    }

    updateInputValue(input, change) {
        const min = parseInt(input.getAttribute('min'), 10);
        const max = parseInt(input.getAttribute('max'), 10);
        const step = parseInt(input.getAttribute('step'), 10);
        let newValue = parseInt(input.value, 10) + change * step;
        newValue = Math.max(min, Math.min(newValue, max));
        input.value = newValue;
        this.updateWorkflowDimension(input.name, newValue);
        this.currentSelection = 'Custom';
        document.getElementById('aspect-ratio-selector').value = 'Custom';
    }

    updateWorkflowDimension(dimension, value) {
        const path = this.config.nodePath;
        // const path = config.nodePath
        updateWorkflow(this.workflow, `${path}.${dimension}`, value);
        // console.log(`Workflow updated - ${dimension}: ${value}`);
    }

    updateWorkflowWithCurrentDimensions() {
        const width = parseInt(document.getElementById('width-input').value, 10);
        const height = parseInt(document.getElementById('height-input').value, 10);
        this.updateWorkflowDimension('width', width);
        this.updateWorkflowDimension('height', height);
    }
}
export default DimensionSelector;




