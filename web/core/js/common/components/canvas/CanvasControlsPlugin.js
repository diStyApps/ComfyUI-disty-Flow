import { CanvasPlugin } from './CanvasPlugin.js';

export class CanvasControlsPlugin extends CanvasPlugin {
    constructor(options = {}) {
        super('CanvasControlsPlugin');

        this.zoomIn = this.zoomIn.bind(this);
        this.zoomOut = this.zoomOut.bind(this);
        this.resetZoom = this.resetZoom.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onAfterRender = this.onAfterRender.bind(this); 
        this.arraysEqual = this.arraysEqual.bind(this);

        this.canvasManager = null;
        this.canvas = null;
        this.isPanning = false;
        this.lastPosX = 0;
        this.lastPosY = 0;
        this.lastTransform = null;
    }

    init(canvasManager) {
        this.canvasManager = canvasManager;
        this.canvas = canvasManager.canvas;

        this.createUI();

        this.attachEventListeners();

        this.lastTransform = this.canvas.viewportTransform.slice();
    }

    createUI() {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            .cc-container * {
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            
            .cc-container {
                display: inline-flex;
                gap: 0.5rem;
                padding: 0.5rem;
                 /* background: var(--color-background); */
                /* border: 1px dashed var(--color-border); */
                user-select: none;
            }

            .cc-button {
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

            .cc-button:hover {
                background: var(--color-button-primary-hover);
            }

            .cc-button svg {
                width: 1.25rem;
                height: 1.25rem;
            }

            .cc-button[data-active="true"] {
                border: 1px dashed var(--color-button-secondary-text-active);
            }

            .cc-divider {
                width: 1px;
                border-left: 1px dashed var(--color-border);
                margin: 0 0.25rem;
                display: none;
            }
            #panBtn {
                display: none;
            }    
        `;
        document.head.appendChild(styleSheet);

        const temp = document.createElement('div');
        temp.innerHTML = `
            <div class="cc-container">
                <button id="zoomInBtn" class="cc-button">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                </button>

                <button id="zoomOutBtn" class="cc-button">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                    </svg>
                </button>

                <div class="cc-divider" ></div>

                <button id="resetZoomBtn" class="cc-button">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>

                <div class="cc-divider"></div>

                <button id="panBtn" class="cc-button">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                    </svg>
                </button>
            </div>
        `;

        this.uiContainer = temp.firstElementChild;
        this.zoomInBtn = this.uiContainer.querySelector('#zoomInBtn');
        this.zoomOutBtn = this.uiContainer.querySelector('#zoomOutBtn');
        this.resetZoomBtn = this.uiContainer.querySelector('#resetZoomBtn');
        this.panBtn = this.uiContainer.querySelector('#panBtn');

        const pluginUIContainer = document.getElementById('pluginUIContainer');
        if (pluginUIContainer) {
            pluginUIContainer.appendChild(this.uiContainer);
        } else {
            console.warn('Element with id "pluginUIContainer" not found.');
        }

        this.updatePanButtonState = (isPanning) => {
            this.panBtn.dataset.active = isPanning;
        };
    }

    attachEventListeners() {
        this.zoomInBtn.addEventListener('click', this.zoomIn);
        this.zoomOutBtn.addEventListener('click', this.zoomOut);
        this.resetZoomBtn.addEventListener('click', this.resetZoom);

        this.canvas.on('mouse:down', this.onMouseDown);
        this.canvas.on('mouse:move', this.onMouseMove);
        this.canvas.on('mouse:up', this.onMouseUp);
        this.canvas.on('mouse:out', this.onMouseUp);

        this.canvas.on('after:render', this.onAfterRender);
    }

    detachEventListeners() {
        this.zoomInBtn.removeEventListener('click', this.zoomIn);
        this.zoomOutBtn.removeEventListener('click', this.zoomOut);
        this.resetZoomBtn.removeEventListener('click', this.resetZoom);

        this.canvas.off('mouse:down', this.onMouseDown);
        this.canvas.off('mouse:move', this.onMouseMove);
        this.canvas.off('mouse:up', this.onMouseUp);
        this.canvas.off('mouse:out', this.onMouseUp);

        this.canvas.off('after:render', this.onAfterRender);
    }

    arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    onAfterRender() {
        const currentTransform = this.canvas.viewportTransform;
        if (!this.arraysEqual(currentTransform, this.lastTransform)) {
            this.lastTransform = currentTransform.slice();
            this.canvasManager.emit('viewport:changed', {
                transform: this.canvas.viewportTransform
            });
        }
    }

    zoomIn() {
        let zoom = this.canvas.getZoom();
        zoom *= 1.1;
        if (zoom > 20) zoom = 20;
        this.canvas.zoomToPoint({ x: this.canvas.width / 2, y: this.canvas.height / 2 }, zoom);
    }

    zoomOut() {
        let zoom = this.canvas.getZoom();
        zoom /= 1.1;
        this.canvas.zoomToPoint({ x: this.canvas.width / 2, y: this.canvas.height / 2 }, zoom);
    }

    resetZoom() {
        this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    }

    onMouseDown(opt) {
        const evt = opt.e;
        if (evt.altKey) {
            this.isPanning = true;
            this.lastPosX = evt.clientX;
            this.lastPosY = evt.clientY;
            this.canvas.setCursor('move');
        }
    }

    onMouseMove(opt) {
        if (this.isPanning) {
            const e = opt.e;
            const deltaX = e.clientX - this.lastPosX;
            const deltaY = e.clientY - this.lastPosY;
            const vpt = this.canvas.viewportTransform;
            const zoom = this.canvas.getZoom();
            vpt[4] += deltaX / zoom;
            vpt[5] += deltaY / zoom;
            this.canvas.requestRenderAll();
            this.lastPosX = e.clientX;
            this.lastPosY = e.clientY;
        }
    }

    onMouseUp(opt) {
        this.isPanning = false;
        this.canvas.setCursor('default');
    }

    destroy() {
        if (this.uiContainer && this.uiContainer.parentNode) {
            this.uiContainer.parentNode.removeChild(this.uiContainer);
        }

        this.detachEventListeners();
    }
}