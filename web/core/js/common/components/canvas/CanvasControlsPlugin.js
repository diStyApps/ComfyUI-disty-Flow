import { CanvasPlugin } from './CanvasPlugin.js';

export class CanvasControlsPlugin extends CanvasPlugin {
    constructor(options = {}) {
        super('CanvasControlsPlugin');

        this.zoomIn = this.zoomIn.bind(this);
        this.zoomOut = this.zoomOut.bind(this);
        this.resetZoom = this.resetZoom.bind(this);
        this.togglePanMode = this.togglePanMode.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onAfterRender = this.onAfterRender.bind(this);
        this.arraysEqual = this.arraysEqual.bind(this);

        this.onBrushActivated = this.onBrushActivated.bind(this);
        this.onBrushDeactivated = this.onBrushDeactivated.bind(this);
        this.onMouseWheel = this.onMouseWheel.bind(this);

        this.canvasManager = null;
        this.canvas = null;
        this.isPanning = false;
        this.isPanMode = true;
        this.isAltPan = false;
        this.lastPosX = 0;
        this.lastPosY = 0;
        this.lastTransform = null;
        this.isDrawingMode = false;
        this.isBrushActivated = false;

        this.switchViewToggleButton = options.switchViewToggleButton || false;
        this.currentView = 'canvasView';
        this.maskingPreviewType = 'cropped'; 

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
        styleSheet.textContent = this.getCSS();
        document.head.appendChild(styleSheet);

        const temp = document.createElement('div');
        temp.innerHTML = this.getHTML();

        this.uiContainer = temp.firstElementChild;
        this.zoomInBtn = this.uiContainer.querySelector('#zoomInBtn');
        this.zoomOutBtn = this.uiContainer.querySelector('#zoomOutBtn');
        this.resetZoomBtn = this.uiContainer.querySelector('#resetZoomBtn');
        this.panBtn = this.uiContainer.querySelector('#panBtn');

        if (this.switchViewToggleButton) {
            this.switchViewBtn = this.uiContainer.querySelector('#switchViewBtn');
        }

        const pluginUIContainer = document.getElementById('pluginUIContainer');
        if (pluginUIContainer) {
            pluginUIContainer.appendChild(this.uiContainer);
        } else {
            console.warn('Element with id "pluginUIContainer" not found.');
        }

        this.panBtn.dataset.active = this.isPanMode;

        this.updatePanButtonState = () => {
            this.panBtn.dataset.active = this.isPanMode || this.isAltPan;
        };

        if (this.switchViewToggleButton && this.switchViewBtn) {
            this.switchViewBtn.addEventListener('click', this.toggleView.bind(this));
        }
    }

    toggleView() {
        if (this.currentView === 'canvasView') {
            this.currentView = 'splitView';
            this.maskingPreviewType = 'none';
            this.switchViewBtn.innerHTML = this.getCanvasViewIcon();
        } else {
            this.currentView = 'canvasView';
            this.maskingPreviewType = 'cropped';
            this.switchViewBtn.innerHTML = this.getSplitViewIcon();
        }

        if (this.canvasManager && typeof this.canvasManager.emit === 'function') {
            this.canvasManager.emit('switchView', this.currentView);
            // this.canvasManager.emit('switchMaskingPreviewType', this.maskingPreviewType);
        } else {
            console.warn('canvasManager.emit is not a function. Unable to emit switchView event.');
        }
    }

    attachEventListeners() {
        this.zoomInBtn.addEventListener('click', this.zoomIn);
        this.zoomOutBtn.addEventListener('click', this.zoomOut);
        this.resetZoomBtn.addEventListener('click', this.resetZoom);
        this.panBtn.addEventListener('click', this.togglePanMode);

        this.canvas.on('mouse:down', this.onMouseDown);
        this.canvas.on('mouse:move', this.onMouseMove);
        this.canvas.on('mouse:up', this.onMouseUp);
        this.canvas.on('mouse:out', this.onMouseUp);
        this.canvas.on('mouse:wheel', this.onMouseWheel);


        this.canvasManager.on('brush:activated', this.onBrushActivated);
        this.canvasManager.on('brush:deactivated', this.onBrushDeactivated);
        this.canvas.on('after:render', this.onAfterRender);


        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
    }

    detachEventListeners() {
        this.zoomInBtn.removeEventListener('click', this.zoomIn);
        this.zoomOutBtn.removeEventListener('click', this.zoomOut);
        this.resetZoomBtn.removeEventListener('click', this.resetZoom);
        this.panBtn.removeEventListener('click', this.togglePanMode);

        if (this.switchViewToggleButton && this.switchViewBtn) {
            this.switchViewBtn.removeEventListener('click', this.toggleView.bind(this));
        }

        this.canvas.off('mouse:down', this.onMouseDown);
        this.canvas.off('mouse:move', this.onMouseMove);
        this.canvas.off('mouse:up', this.onMouseUp);
        this.canvas.off('mouse:out', this.onMouseUp);

        this.canvas.off('after:render', this.onAfterRender);

        this.canvasManager.on('brush:activated', this.onBrushActivated);
        this.canvasManager.on('brush:deactivated', this.onBrushDeactivated);

        this.canvas.off('mouse:wheel', this.onMouseWheel); 

        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
    }

    arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    onBrushActivated() {
        this.isBrushActivated = true;
        this.isPanMode = false;
        this.updatePanButtonState();
    }

    onBrushDeactivated() {
        this.isBrushActivated = false;
        this.isPanMode = true;
        this.updatePanButtonState();
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

    onKeyDown(e) {
        const key = e.key;
        switch (key) {
            case 'Alt':
                if (!this.isAltKeyPressed) {
                    this.isAltKeyPressed = true;
                }
                break;
            case 'Control':
                if (!this.isCtrlKeyPressed) {
                    this.isCtrlKeyPressed = true;
                }
                break;
            case 'Shift':
                if (!this.isShiftKeyPressed) {
                    this.isShiftKeyPressed = true;
                }
                break;
            case 'h':
                this.togglePanMode();    
                break;
            default:
                break;
        }
    }

    onKeyUp(e) {
        const key = e.key;
        this.isDrawingMode = false;

        switch (key) {
            case 'Alt':
                if (this.isAltKeyPressed) {
                    this.isAltKeyPressed = false;
                }
                break;
            case 'Control':
                if (this.isCtrlKeyPressed) {
                    this.isCtrlKeyPressed = false;
                }
                break;
            case 'Shift':
                if (this.isShiftKeyPressed) {
                    this.isShiftKeyPressed = false;
                }
                break;
            default:
                break;
        }
        e.preventDefault();
    }

    onMouseDown(opt) {
        if (this.isPanMode || this.isAltPan) {
            this.isPanning = true;
            const evt = opt.e;
            this.lastPosX = evt.clientX;
            this.lastPosY = evt.clientY;
            this.canvas.setCursor('grabbing');
            evt.preventDefault();
            evt.stopPropagation();
        }
    }

    onMouseMove(opt) {
        if (this.isPanning) {
            const e = opt.e;
            const deltaX = e.clientX - this.lastPosX;
            const deltaY = e.clientY - this.lastPosY;
            const vpt = this.canvas.viewportTransform;
            const zoom = this.canvas.getZoom();
            // const panFactor = (zoom + 1) / 10;
            let panFactor;
            if (zoom <= 1) {
                panFactor = (zoom + 1) / 2;
            } else if (zoom <= 3) {
                panFactor = (zoom + 2) / 4;
            } else if (zoom <= 6) {
                panFactor = (zoom + 3) / 7;
            } else {
                panFactor = (zoom + 1) / 10;
            }

            // console.log('panFactor', panFactor);
            // console.log('zoom', zoom);
            
            vpt[4] += deltaX * panFactor;
            vpt[5] += deltaY * panFactor;
            this.canvas.requestRenderAll();
            this.lastPosX = e.clientX;
            this.lastPosY = e.clientY;
        }
    }

    onMouseUp(opt) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.setCursor(this.isPanMode || this.isAltPan ? 'grab' : 'default');
        }
    }
    togglePanMode() {
        this.isPanMode = !this.isPanMode;
        this.updatePanButtonState();
        this.canvasManager.emit('pan:toggled');

        // if (this.isPanMode) {
        //     this.canvas.setCursor('grab');
        //     this.canvasManager.emit('pan:activated');

        // } else {
        //     this.canvas.setCursor('default');
        //     this.canvasManager.emit('pan:deactivated');
        // }
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
        if (zoom < 0.1) zoom = 0.1;
        this.canvas.zoomToPoint({ x: this.canvas.width / 2, y: this.canvas.height / 2 }, zoom);
    }

    resetZoom() {
        this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    }


    zoom(e,delta) {
        let zoom = this.canvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.1) zoom = 0.1;
        this.canvas.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
        // this.canvasManager.emit('zoom:changed', { zoom });                    
    }

    horizontalPan(delta) {
        const vpt = this.canvas.viewportTransform;
        const panDelta = delta / 10; // Adjust pan speed as necessary
        vpt[4] += panDelta;
        this.canvas.requestRenderAll();
        // this.canvasManager.emit('pan:changed', { x: vpt[4], y: vpt[5] });
    }

    verticalPan(delta) {
        const vpt = this.canvas.viewportTransform;
        const panDelta = delta / 10; // Adjust pan speed as necessary
        vpt[5] += panDelta;
        this.canvas.requestRenderAll();
        // this.canvasManager.emit('pan:changed', { x: vpt[4], y: vpt[5] });        
    }

    onMouseWheel(opt) {
        const e = opt.e;
        const delta = e.deltaY;
        const pointer = this.canvas.getPointer(e);
        // console.log('pointer', pointer);
        // console.log('isDrawingMode', this.isDrawingMode);
        if (!this.isDrawingMode) {
                if (e.altKey) {
                    this.zoom(e,delta);
                } else if (e.ctrlKey) {
                    this.horizontalPan(delta);
                } else if (e.shiftKey) {
                    this.verticalPan(delta);
                } else {
                    if (!this.isBrushActivated) {
                        this.zoom(e,delta);
                    }
                }
            }
            e.preventDefault();
            e.stopPropagation();
    }

    destroy() {
        if (this.uiContainer && this.uiContainer.parentNode) {
            this.uiContainer.parentNode.removeChild(this.uiContainer);
        }
        this.detachEventListeners();
    }

    getHTML() {
        return  `
        <div class="cc-container">
            <button id="zoomInBtn" class="cc-button" title="Zoom In">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
            </button>

            <button id="zoomOutBtn" class="cc-button" title="Zoom Out">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
            </button>

            <div class="cc-divider"></div>

            <button id="resetZoomBtn" class="cc-button" title="Reset Zoom">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z" fill="currentColor"/>
                </svg>
            </button>

            <button id="panBtn" class="cc-button" title="Panning">
                ${this.getPanHandIcon()}
            </button>
            ${this.switchViewToggleButton ? `
            <button id="switchViewBtn" class="cc-button" title="Switch View">
                ${this.getSplitViewIcon()}
            </button>
            ` : ''}
        </div>
    `;
    }
    getCSS() {
        return`
            .cc-container * {
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            
            .cc-container {
                display: inline-flex;
                gap: 0.5rem;
                padding: 0.5rem;
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
            #panBtn{
                
            }
        `;
    }
    getPanHandIcon() {
        return `
            <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
            width="512.000000pt" height="512.000000pt" viewBox="0 0 512.000000 512.000000"
            preserveAspectRatio="xMidYMid meet">

            <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)"
            fill="currentColor" stroke="none">
            <path d="M2826 4936 c-54 -20 -106 -65 -141 -121 l-30 -48 -5 -1165 -5 -1164
            -28 -24 c-36 -31 -78 -31 -114 0 l-28 24 -5 1044 -5 1043 -23 37 c-102 163
            -321 171 -428 16 -18 -26 -37 -70 -43 -98 -8 -35 -11 -490 -11 -1481 0 -1558
            4 -1454 -57 -1511 -43 -40 -102 -54 -155 -36 -24 8 -207 128 -408 267 -201
            139 -383 262 -405 274 -63 32 -155 29 -224 -8 -58 -32 -120 -104 -140 -164
            -24 -74 -10 -167 36 -229 14 -18 333 -311 709 -652 474 -429 707 -633 754
            -661 38 -22 111 -55 162 -72 l93 -32 700 0 700 0 85 23 c362 99 627 381 696
            740 12 62 14 308 14 1476 l0 1402 -26 52 c-94 189 -355 187 -457 -3 -22 -40
            -22 -46 -27 -730 -3 -379 -9 -697 -13 -706 -9 -17 -49 -39 -72 -39 -27 0 -63
            22 -74 47 -8 17 -11 314 -11 1032 0 877 -2 1013 -15 1052 -35 102 -130 169
            -239 169 -107 0 -192 -56 -237 -155 -18 -38 -19 -95 -19 -1063 l0 -1024 -29
            -29 c-38 -37 -82 -39 -116 -4 l-25 24 0 1139 c0 1262 3 1200 -66 1280 -20 24
            -54 52 -77 63 -52 27 -140 34 -191 15z"/>
            </g>
            </svg>
        `;
    }
    getCanvasViewIcon() {
        return `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    }
    
    getSplitViewIcon() {
        return `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 4h16v16H4V4zM12 4v16" />
        </svg>
    `;
    }

}




