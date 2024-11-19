import { CanvasPlugin } from './CanvasPlugin.js';

export class ImageAdderPlugin extends CanvasPlugin {
    constructor(options = {}) {
        super('ImageAdderPlugin');

        this.options = {
            ...options
        };

        this.canvasManager = null;
        this.canvas = null;

        this.handleAddImage = this.handleAddImage.bind(this);
    }

    init(canvasManager) {
        this.canvasManager = canvasManager;
        this.canvas = canvasManager.canvas;

        this.createUI();

        this.attachEventListeners();
    }

    createUI() {
        const html = `
            <div class="image-adder-plugin-ui" style="
                margin-top: 10px;
            ">
                <label for="image-color-picker">Image Color:</label>
                <input type="color" id="image-color-picker" value="#ff0000" style="width: 100%; margin-bottom: 10px;">

                <label for="image-width-input">Width (px):</label>
                <input type="number" id="image-width-input" value="100" min="10" style="width: 100%; margin-bottom: 10px;">

                <label for="image-height-input">Height (px):</label>
                <input type="number" id="image-height-input" value="100" min="10" style="width: 100%; margin-bottom: 10px;">

                <button id="add-image-button" style="
                    width: 100%;
                    padding: 8px;
                    margin-top: 10px;
                    cursor: pointer;
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 4px;
                ">
                    Add Image
                </button>
            </div>
        `;

        this.uiContainer = document.createElement('div');
        this.uiContainer.innerHTML = html;
        this.uiContainer.className = 'image-adder-plugin-container';

        this.uiContainer.style.padding = '10px';
        this.uiContainer.style.borderRadius = '5px';
        this.uiContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
        this.uiContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        this.uiContainer.style.marginTop = '10px';

        const pluginUIContainer = document.getElementById('pluginUIContainer');
        if (pluginUIContainer) {
            pluginUIContainer.appendChild(this.uiContainer);
        } else {
            console.warn('pluginUIContainer element not found in the DOM.');
        }
    }

    attachEventListeners() {
        const addButton = this.uiContainer.querySelector('#add-image-button');
        addButton.addEventListener('click', this.handleAddImage);
    }

    detachEventListeners() {
        const addButton = this.uiContainer.querySelector('#add-image-button');
        addButton.removeEventListener('click', this.handleAddImage);
    }

    handleAddImage() {
        const colorPicker = this.uiContainer.querySelector('#image-color-picker');
        const widthInput = this.uiContainer.querySelector('#image-width-input');
        const heightInput = this.uiContainer.querySelector('#image-height-input');

        const color = colorPicker.value;
        const width = parseInt(widthInput.value, 10);
        const height = parseInt(heightInput.value, 10);

        if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
            alert('Please enter valid width and height values.');
            return;
        }

        const rect = new fabric.Rect({
            width: width,
            height: height,
            fill: color,
            left: this.canvas.getWidth() / 2,
            top: this.canvas.getHeight() / 2,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: true,
            hasBorders: true,
        });

        this.canvas.add(rect);
        this.canvas.setActiveObject(rect);
        this.canvas.requestRenderAll();

        this.canvasManager.emit('image:added', {
            type: 'rectangle',
            object: rect,
            color: color,
            width: width,
            height: height,
        });
    }

    destroy() {
        if (this.uiContainer && this.uiContainer.parentNode) {
            this.uiContainer.parentNode.removeChild(this.uiContainer);
        }
        this.detachEventListeners();
    }
}
