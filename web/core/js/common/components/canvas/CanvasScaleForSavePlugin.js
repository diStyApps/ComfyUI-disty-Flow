import { CanvasPlugin } from './CanvasPlugin.js';

export class CanvasScaleForSavePlugin extends CanvasPlugin {
    constructor(options = {}) {
        super('CanvasScaleForSavePlugin');

        this.increaseScale = this.increaseScale.bind(this);
        this.decreaseScale = this.decreaseScale.bind(this);
        this.updateScaleDisplay = this.updateScaleDisplay.bind(this);
        this.emitScaleChange = this.emitScaleChange.bind(this);
        this.downloadCanvasImage = this.downloadCanvasImage.bind(this);
        this.onCanvasResized = this.onCanvasResized.bind(this);

        this.defaultScale = options.defaultScale || 1;
        this.showDownloadButton = options.showDownloadButton !== undefined ? options.showDownloadButton : true;

        this.scale = this.defaultScale;

        this.uiContainer = null;
        this.scaleDecreaseBtn = null;
        this.scaleIncreaseBtn = null;
        this.scaleValueDisplay = null;
        this.actualSizeDisplay = null;
        this.downloadBtn = null;
    }

    init(canvasManager) {
        this.canvasManager = canvasManager;
        this.canvas = canvasManager.canvas;

        this.createUI();
        this.attachEventListeners();
        this.updateActualSize();
    }

    createUI() {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            .csfs-container * {
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            
            .csfs-container {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem;
                /* background: var(--color-background); */
                /* border: 1px dashed var(--color-border); */
                user-select: none;
                margin-left: 1rem; /* Adjust as needed to align with existing controls */
            }

            .csfs-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0.5rem;
                background: var(--color-button-primary);
                border: none;
                cursor: pointer;
                transition: all 0.2s;
                color: var(--color-primary-text);
                min-width: 36px;
                height: 36px;
            }

            .csfs-button:hover {
                background: var(--color-button-primary-hover);
            }

            .csfs-button svg {
                width: 1.25rem;
                height: 1.25rem;
            }

            .csfs-button[data-active="true"] {
                border: 1px dashed var(--color-button-secondary-text-active);
            }

            /* Styles for scale controls */
            .csfs-scale-container {
                display: inline-flex;
                align-items: center;
                gap: 0.25rem;
                padding: 0.5rem;
            }

            .csfs-scale-label {
                margin-right: 0.25rem;
                font-weight: bold;
            }

            .csfs-scale-display {
                margin-left: 0.5rem;
                font-size: 0.9rem;
                color: var(--color-secondary-text);
                font-weight: bold;

            }
            .csfs-scale-value {
                padding:  8px 8px;
                font-weight: bold;
            }
        `;
        document.head.appendChild(styleSheet);

        const temp = document.createElement('div');
        temp.innerHTML = `
            <div class="csfs-container">
                <!-- Canvas Scale Controls -->
                <div class="csfs-scale-container">
                   <!--  <span class="csfs-scale-label">Canvas Save Scale</span> -->
                                    ${this.showDownloadButton ? `
                <!-- Download Button -->
                <button id="csfs-downloadBtn" class="csfs-button" title="Download Canvas Image">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 12l5 5m0 0l5-5m-5 5V3" />
                    </svg>
                </button>
                ` : ''}
                    <button id="csfs-scaleDecreaseBtn" class="csfs-button csfs-scale-button" title="Decrease Save Scale">-</button>
                    <button id="csfs-scaleIncreaseBtn" class="csfs-button csfs-scale-button" title="Increase Save Scale">+</button>
                    <span id="csfs-scaleValue" class="csfs-scale-value" title="Canvas Save Scale">1x</span>

                    <span id="csfs-actualSize" class="csfs-scale-display" title="Canvas Save Dimensions">512x512</span>
                </div>
            </div>
        `;

        this.uiContainer = temp.firstElementChild;
        this.scaleDecreaseBtn = this.uiContainer.querySelector('#csfs-scaleDecreaseBtn');
        this.scaleIncreaseBtn = this.uiContainer.querySelector('#csfs-scaleIncreaseBtn');
        this.scaleValueDisplay = this.uiContainer.querySelector('#csfs-scaleValue');
        this.actualSizeDisplay = this.uiContainer.querySelector('#csfs-actualSize');
        this.downloadBtn = this.uiContainer.querySelector('#csfs-downloadBtn');

        const pluginUIContainer = document.getElementById('pluginUIContainer');
        if (pluginUIContainer) {
            pluginUIContainer.appendChild(this.uiContainer);
        } else {
            console.warn('Element with id "pluginUIContainer" not found.');
        }
    }

    attachEventListeners() {
        this.scaleIncreaseBtn.addEventListener('click', this.increaseScale);
        this.scaleDecreaseBtn.addEventListener('click', this.decreaseScale);

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', this.downloadCanvasImage);
        }

        this.canvasManager.on('canvas:resized', this.onCanvasResized);
    }


    detachEventListeners() {
        this.scaleIncreaseBtn.removeEventListener('click', this.increaseScale);
        this.scaleDecreaseBtn.removeEventListener('click', this.decreaseScale);

        if (this.downloadBtn) {
            this.downloadBtn.removeEventListener('click', this.downloadCanvasImage);
        }

        this.canvasManager.off('canvas:resized', this.onCanvasResized);
    }

    increaseScale() {
        if (this.scale < 10) { 
            this.scale += 1;
            this.updateScaleDisplay();
            this.emitScaleChange();
            this.updateActualSize(); 
        }
    }

    decreaseScale() {
        if (this.scale > 1) { 
            this.scale -= 1;
            this.updateScaleDisplay();
            this.emitScaleChange();
            this.updateActualSize();
        }
    }

    updateScaleDisplay() {
        this.scaleValueDisplay.textContent = `${this.scale}x`;
    }

    emitScaleChange() {
        this.canvasManager.emit('canvas:scaleChanged', { scale: this.scale });
    }

    updateActualSize() {
        const canvasWidth = this.canvas.getWidth();
        const canvasHeight = this.canvas.getHeight();
        const scaledWidth = Math.round(canvasWidth * this.scale);
        const scaledHeight = Math.round(canvasHeight * this.scale);
        this.actualSizeDisplay.textContent = `${scaledWidth}x${scaledHeight}`;
    }

    onCanvasResized(data) {
        this.updateActualSize();
    }

    downloadCanvasImage() {
        const dataURL = this.canvasManager.getCanvasImage();
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'canvas-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    destroy() {
        if (this.uiContainer && this.uiContainer.parentNode) {
            this.uiContainer.parentNode.removeChild(this.uiContainer);
        }

        this.detachEventListeners();
    }
}
