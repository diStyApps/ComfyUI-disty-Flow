import { CustomBrushPlugin } from './CustomBrushPlugin.js';
import { MaskExportUtilities } from './MaskExportUtilities.js';
import { store } from  '../../scripts/stateManagerMain.js';

export class MaskBrushPlugin extends CustomBrushPlugin {
    constructor(options = {}) {
        super({ ...options, name: 'MaskBrushPlugin' });

        this.masks = [];
        this.currentMask = null;
        this.maskStrokeHistory = {};
        this.brushIcon = '/core/media/ui/double-face-mask.png';
        this.isSubscribed = false;
        this.resizeObserver = null;
        this.clearMasksOnImageLoaded = options.clearMasksOnImageLoaded !== undefined ? options.clearMasksOnImageLoaded : true;
        this.onAddMask = this.onAddMask.bind(this);
        this.onChangeMask = this.onChangeMask.bind(this);
        this.onChangeMaskColor = this.onChangeMaskColor.bind(this);
        this.onMoveMaskUp = this.onMoveMaskUp.bind(this);
        this.onMoveMaskDown = this.onMoveMaskDown.bind(this);
        this.onApplyColorToExistingMaskChange = this.onApplyColorToExistingMaskChange.bind(this);
        this.onHandleSave = this.onHandleSave.bind(this);
        this.onRemoveMask = this.onRemoveMask.bind(this);
        this.onImageLoaded = this.onImageLoaded.bind(this);
        this.onCanvasStateChanged = this.onCanvasStateChanged.bind(this);
        this.onHandleSaveFromCanvas = this.onHandleSaveFromCanvas.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        this.onUndoMaskStroke = this.onUndoMaskStroke.bind(this);
        this.onRedoMaskStroke = this.onRedoMaskStroke.bind(this);
        this.onImageModified = this.onImageModified.bind(this);
        this.onClearMask = this.onClearMask.bind(this);
        this.onClearAllMasks = this.onClearAllMasks.bind(this);
        this.onToggleHideMask = this.onToggleHideMask.bind(this);
        this.onToggleHideAllMasks = this.onToggleHideAllMasks.bind(this);
        this.handleStateChange = this.handleStateChange.bind(this);


        this.maskExportUtilities = new MaskExportUtilities(this);
    }

    init(canvasManager) {
        super.init(canvasManager);

        if (this.brushOpacityInput && this.brushOpacityInput.parentElement) {
            this.brushOpacityInput.parentElement.style.display = 'none';
        }

        this.extendUI();

        this.attachAdditionalEventListeners();

        window.addEventListener('resize', this.onWindowResize);
        
        this.canvasManager.on('image:loaded', this.onImageLoaded);
        this.canvasManager.on('canvas:state:changed', this.onCanvasStateChanged);
        this.canvasManager.on('undo:mask:stroke', this.onUndoMaskStroke);
        this.canvasManager.on('redo:mask:stroke', this.onRedoMaskStroke);
        this.canvasManager.on('save:trigger', this.onHandleSaveFromCanvas);

        this.setupResizeObserver();
    }

    setupResizeObserver() {
        const canvasContainer = this.canvas.getElement().parentElement;
        if (!canvasContainer) {
            console.error('Canvas container element not found.');
            return;
        }

        this.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.target === canvasContainer) {
                    this.onImageModified();
                }
            }
        });

        this.resizeObserver.observe(canvasContainer);
    }

    extendUI() {
        const temp = document.createElement('div');
        temp.innerHTML = `
            <div class="mbp-container">
                <div class="mbp-toggle-wrapper" style="display: none;">
                    <label for="applyColorToMaskCheckbox" class="mbp-label">Mask Color Fill</label>
                    <label class="mbp-toggle" for="applyColorToMaskCheckbox">
                        <input type="checkbox" id="applyColorToMaskCheckbox">
                        <span class="mbp-toggle-slider"></span>
                    </label>
                </div>
                <div class="mbp-header" style="display: none;">
                    <select id="maskList" class="mbp-select">
                        <option value="" disabled selected>Select a mask</option>
                    </select>
                </div>

                <div class="mbp-button-group" style="display: none;">
                    <button id="addMaskBtn" class="mbp-button" title="Add New Mask">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                    <button id="removeMaskBtn" class="mbp-button"  title="Remove Mask">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
                    <label for="" class="mbp-label" style="display: none;">Mask Order</label>
                <div class="mbp-button-group" style="display: none;">
                    <button id="moveMaskUpBtn" class="mbp-button" title="Move Mask Up">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                    <button id="moveMaskDownBtn" class="mbp-button" title="Move Mask Down">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                <div class="mbp-button-group" ">
                    <button id="clearMaskBtn" class="mbp-button" title="Clear Mask" style="display: none;">
                        Clear
                    </button>
                    <button id="clearAllMasksBtn" class="mbp-button" title="Clear All Masks">
                        <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
                        width="512.000000pt" height="512.000000pt" viewBox="0 0 512.000000 512.000000"
                        preserveAspectRatio="xMidYMid meet">

                        <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)"
                        fill="currentColor" stroke="none">
                        <path d="M413 4049 c-69 -27 -147 -110 -168 -181 -19 -63 -19 -121 -2 -179 8
                        -24 129 -228 270 -453 142 -226 253 -414 249 -418 -5 -5 -83 -49 -173 -99 -90
                        -50 -175 -100 -188 -112 -41 -38 -71 -115 -71 -184 0 -57 5 -72 65 -187 l66
                        -125 65 -318 c69 -336 71 -361 34 -432 -39 -77 -105 -119 -211 -136 -45 -7
                        -72 -36 -72 -77 0 -49 35 -72 103 -65 135 12 252 93 312 214 54 109 51 170
                        -21 518 -33 159 -59 291 -57 292 1 2 285 159 631 349 574 316 629 344 639 328
                        6 -11 113 -203 237 -429 169 -305 224 -413 216 -421 -7 -6 -42 -27 -79 -47
                        l-66 -36 -102 187 c-56 103 -111 195 -122 205 -43 36 -118 4 -118 -52 0 -12
                        47 -108 105 -213 84 -153 103 -194 93 -203 -17 -15 -545 -305 -555 -305 -5 0
                        -71 115 -147 255 -77 141 -145 260 -152 266 -20 17 -72 14 -94 -6 -38 -35 -27
                        -68 120 -334 77 -140 137 -258 133 -261 -5 -4 -42 -26 -83 -48 l-76 -41 -84
                        161 c-69 131 -90 163 -112 170 -37 13 -80 -9 -93 -46 -9 -26 0 -47 89 -220 54
                        -105 108 -201 119 -213 12 -13 32 -23 48 -23 16 0 223 108 540 283 283 156
                        575 317 649 357 151 84 170 99 170 137 0 24 -309 600 -607 1130 -81 145 -125
                        193 -198 213 -91 25 -137 13 -331 -94 -97 -53 -181 -93 -185 -89 -4 4 -97 197
                        -208 428 -110 231 -215 440 -233 465 -49 67 -139 110 -226 109 -42 0 -87 -8
                        -119 -20z m206 -157 c27 -22 74 -113 258 -497 217 -457 250 -515 291 -515 10
                        0 112 52 227 116 232 129 263 138 310 94 33 -31 99 -150 88 -161 -10 -10
                        -1224 -679 -1233 -679 -3 0 -25 36 -49 81 -48 89 -50 128 -8 166 12 11 108 67
                        212 124 202 110 235 134 235 172 0 13 -121 216 -285 477 -273 435 -285 456
                        -285 503 0 130 139 199 239 119z"/>
                        <path d="M3750 3114 c-98 -26 -179 -72 -255 -148 -97 -95 -147 -198 -170 -346
                        -5 -33 -8 -36 -58 -48 -60 -14 -144 -69 -182 -118 -55 -72 -79 -142 -79 -231
                        0 -74 3 -88 37 -156 59 -120 158 -190 286 -203 56 -6 64 -5 86 16 15 14 25 35
                        25 51 0 43 -28 67 -94 78 -74 14 -112 36 -153 89 -79 104 -42 256 77 319 71
                        38 180 26 247 -27 82 -64 170 39 93 110 -28 27 -109 70 -130 70 -23 0 -2 106
                        37 186 33 68 126 157 197 190 207 95 453 7 555 -198 l32 -63 -52 -23 c-73 -32
                        -135 -79 -149 -112 -25 -59 43 -122 96 -89 93 58 118 70 168 80 192 35 366
                        -125 354 -326 -6 -86 -29 -135 -104 -216 -30 -32 -54 -67 -54 -77 0 -10 18
                        -42 40 -72 114 -153 112 -348 -6 -478 -24 -28 -65 -64 -92 -80 -99 -64 -53
                        -62 -1284 -62 -1105 0 -1118 0 -1138 -20 -24 -24 -26 -67 -4 -98 l15 -22 1148
                        0 c1026 0 1153 2 1202 16 232 69 389 272 389 502 0 90 -22 180 -60 249 l-29
                        51 44 67 c96 143 108 307 34 463 -57 118 -180 215 -316 245 l-56 13 -22 61
                        c-63 176 -234 325 -413 362 -72 15 -195 13 -262 -5z"/>
                        <path d="M3681 1994 c-37 -16 -50 -56 -30 -93 14 -25 32 -34 93 -46 16 -3 44
                        -21 63 -40 29 -29 33 -39 33 -84 0 -44 -5 -56 -34 -89 l-34 -37 -432 -5 -432
                        -5 -19 -24 c-24 -30 -24 -62 0 -92 l19 -24 434 0 433 0 53 24 c208 94 214 392
                        10 497 -47 24 -122 33 -157 18z"/>
                        <path d="M1759 1212 c-28 -23 -30 -73 -4 -102 26 -29 126 -29 155 0 26 26 25
                        60 -1 94 -17 22 -28 26 -74 26 -36 0 -60 -6 -76 -18z"/>
                        </g>
                        </svg>
                    </button>
                </div>
                <div class="mbp-toggle-wrapper">
                    <label for="hideMaskCheckbox" class="mbp-label">Hide Mask</label>
                    <label class="mbp-toggle" for="hideMaskCheckbox">
                        <input type="checkbox" id="hideMaskCheckbox">
                        <span class="mbp-toggle-slider"></span>
                    </label>
                </div>
                <div class="mbp-toggle-wrapper" style="display: none;">
                    <label for="hideAllMasksCheckbox" class="mbp-label">Hide All Masks</label>
                    <label class="mbp-toggle" for="hideAllMasksCheckbox">
                        <input type="checkbox" id="hideAllMasksCheckbox">
                        <span class="mbp-toggle-slider"></span>
                    </label>
                </div>
                <select id="saveOptionsSelect" class="mbp-select" style="display: none;">
                </select>
                <button id="saveMaskBtn" class="mbp-button" style="width: 100%; display: none;" title="Save Mask">
                    <!-- SVG icon -->
                    Save
                </button>
                <button id="disableDrawingModeBtn" class="mbp-button" style="width: 100%; display: none;" title="Disable Drawing Mode">
            </div>
        `;


        while (temp.firstChild) {
            this.uiContainer.appendChild(temp.firstChild);
        }

        this.addMaskBtn = this.uiContainer.querySelector('#addMaskBtn');
        this.maskList = this.uiContainer.querySelector('#maskList');
        this.applyColorToMaskCheckbox = this.uiContainer.querySelector('#applyColorToMaskCheckbox');
        this.moveMaskUpBtn = this.uiContainer.querySelector('#moveMaskUpBtn');
        this.moveMaskDownBtn = this.uiContainer.querySelector('#moveMaskDownBtn');
        this.removeMaskBtn = this.uiContainer.querySelector('#removeMaskBtn');
        this.clearMaskBtn = this.uiContainer.querySelector('#clearMaskBtn');
        this.clearAllMasksBtn = this.uiContainer.querySelector('#clearAllMasksBtn');
        this.hideMaskCheckbox = this.uiContainer.querySelector('#hideMaskCheckbox');
        this.hideAllMasksCheckbox = this.uiContainer.querySelector('#hideAllMasksCheckbox');
        this.saveOptionsSelect = this.uiContainer.querySelector('#saveOptionsSelect');
        this.saveMaskBtn = this.uiContainer.querySelector('#saveMaskBtn');
        this.disableDrawingModeBtn = this.uiContainer.querySelector('#disableDrawingModeBtn');
        
        this.saveOptions = [
            {
                value: 'saveCroppedMask',
                text: 'Cropped Mask',
                handler: () => this.maskExportUtilities.saveCroppedMask(),
                exportFunction: () => this.maskExportUtilities.exportCroppedMask(),
                show: true,
            },  
            {
                value: 'saveCroppedAlphaOnImage',
                text: 'Cropped Alpha',
                handler: () => this.maskExportUtilities.saveCroppedAlphaOnImage(),
                exportFunction: () => this.maskExportUtilities.exportCroppedAlphaOnImage(),
                show: true,
            },  
            {
                value: 'saveCroppedImage',
                text: 'Cropped Image',
                handler: () => this.maskExportUtilities.saveCroppedImage(),
                exportFunction: () => this.maskExportUtilities.exportCroppedImage(),
                show: true,
            },   
          
            {
                value: 'saveMaskAlphaOnImage',
                text: 'Mask As Alpha on Image',
                handler: () => this.maskExportUtilities.saveMaskAlphaOnImage(),
                exportFunction: () => this.maskExportUtilities.exportMaskAlphaOnImage(),
                show: true,
            },
            {
                value: 'saveAllMasksAlphaOnImage',
                text: 'All Masks As Alpha on Image',
                handler: () => this.maskExportUtilities.saveAllMasksAlphaOnImage(),
                exportFunction: () => this.maskExportUtilities.exportAllMasksAlphaOnImage(),
                show: true,
            },
            {
                value: 'saveAllMasksCombinedAlphaOnImage',
                text: 'All Masks As Alpha Combined on Image',
                handler: () => this.maskExportUtilities.saveAllMasksCombinedAlphaOnImage(),
                exportFunction: () => this.maskExportUtilities.exportAllMasksCombinedAlphaOnImage(),
                show: true,
            },
            {
                value: 'saveMask',
                text: 'Mask',
                handler: () => this.maskExportUtilities.saveMask(),
                exportFunction: () => this.maskExportUtilities.exportMask(),
                show: true,
            },
            {
                value: 'saveAllMasks',
                text: 'All Masks',
                handler: () => this.maskExportUtilities.saveAllMasks(),
                exportFunction: () => this.maskExportUtilities.exportAllMasks(),
                show: true,
            },
            {
                value: 'saveAllMasksCombined',
                text: 'All Masks Combined',
                handler: () => this.maskExportUtilities.saveAllMasksCombined(),
                exportFunction: () => this.maskExportUtilities.exportAllMasksCombined(),
                show: true,
            },
            {
                value: 'saveAllMasksCombinedBW',
                text: 'All Masks Combined (B&W)',
                handler: () => this.maskExportUtilities.saveAllMasksCombinedBlackWhite(),
                exportFunction: () => this.maskExportUtilities.exportMasksCombinedBlackWhite(),
                show: true,
            },
            {
                value: 'saveMaskOnImage',
                text: 'Mask on Image',
                handler: () => this.maskExportUtilities.saveMaskOnImage(),
                exportFunction: () => this.maskExportUtilities.exportMaskOnImage(),
                show: true,
            },
            {
                value: 'saveAllMasksOnImage',
                text: 'All Masks on Image',
                handler: () => this.maskExportUtilities.saveAllMasksOnImage(),
                exportFunction: () => this.maskExportUtilities.exportAllMasksOnImage(),
                show: true,
            },
            {
                value: 'saveAllMasksCombinedOnImage',
                text: 'All Masks Combined on Image',
                handler: () => this.maskExportUtilities.saveAllMasksCombinedOnImage(),
                exportFunction: () => this.maskExportUtilities.exportAllMasksCombinedOnImage(),
                show: true,
            },
            {
                value: 'saveAllMasksCombinedBWOnImage',
                text: 'All Masks Combined (B&W) on Image',
                handler: () => this.maskExportUtilities.saveAllMasksCombinedBlackWhiteOnImage(),
                exportFunction: () => this.maskExportUtilities.exportAllMasksCombinedBlackWhiteOnImage(),
                show: true,
            },
        ];

        this.saveOptions.forEach(optionData => {
            if (optionData.show) {
                const option = document.createElement('option');
                option.value = optionData.value;
                option.text = optionData.text;
                this.saveOptionsSelect.add(option);
            }
        });
    }

    attachAdditionalEventListeners() {
        this.addMaskBtn.addEventListener('click', this.onAddMask);
        this.maskList.addEventListener('change', this.onChangeMask);
        this.colorPicker.addEventListener('input', this.onChangeMaskColor);
        this.applyColorToMaskCheckbox.addEventListener('change', this.onApplyColorToExistingMaskChange);
        this.moveMaskUpBtn.addEventListener('click', this.onMoveMaskUp);
        this.moveMaskDownBtn.addEventListener('click', this.onMoveMaskDown);
        this.removeMaskBtn.addEventListener('click', this.onRemoveMask);
        this.clearMaskBtn.addEventListener('click', this.onClearMask);
        this.clearAllMasksBtn.addEventListener('click', this.onClearAllMasks);
        this.hideMaskCheckbox.addEventListener('change', this.onToggleHideMask);
        this.hideAllMasksCheckbox.addEventListener('change', this.onToggleHideAllMasks);
        this.saveMaskBtn.addEventListener('click', this.onHandleSave);
    }

    detachAdditionalEventListeners() {
        this.addMaskBtn.removeEventListener('click', this.onAddMask);
        this.maskList.removeEventListener('change', this.onChangeMask);
        this.colorPicker.removeEventListener('input', this.onChangeMaskColor);
        this.applyColorToMaskCheckbox.removeEventListener('change', this.onApplyColorToExistingMaskChange);
        this.moveMaskUpBtn.removeEventListener('click', this.onMoveMaskUp);
        this.moveMaskDownBtn.removeEventListener('click', this.onMoveMaskDown);
        this.removeMaskBtn.removeEventListener('click', this.onRemoveMask);
        this.clearMaskBtn.removeEventListener('click', this.onClearMask);
        this.clearAllMasksBtn.removeEventListener('click', this.onClearAllMasks);
        this.hideMaskCheckbox.removeEventListener('change', this.onToggleHideMask);
        this.hideAllMasksCheckbox.removeEventListener('change', this.onToggleHideAllMasks);
        this.saveMaskBtn.removeEventListener('click', this.onHandleSave);

        this.canvasManager.off('image:loaded', this.onImageLoaded);
        this.canvasManager.off('canvas:state:changed', this.onCanvasStateChanged);
        this.canvasManager.off('undo:mask:stroke', this.onUndoMaskStroke);
        this.canvasManager.off('redo:mask:stroke', this.onRedoMaskStroke);

        window.removeEventListener('resize', this.onWindowResize);

        this.canvasManager.off('save:trigger', this.onHandleSaveFromCanvas);

        // Disconnect the ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    onWindowResize() {
        this.onImageModified();
    }

    handleStateChange(state) {
        // console.log('---Current state---', state.hideMask);
        // console.log('---this.clearMasksOnImageLoaded ---', this.clearMasksOnImageLoaded );


        if (this.clearMasksOnImageLoaded == false) {
            if (state.hideMask) {
                this.hideMaskCheckbox.checked = true;
                // this.currentMask.visible  = false
                // this.currentMask.fabricImage.visible = this.currentMask.visible
                // this.canvas.renderAll();
                // console.log('---Current state--- hideMask true', state.hideMask);
            } else {
                // console.log('---Current state--- hideMask false', state.hideMask);
                // this.hideMaskCheckbox.checked = false;
                // this.canvas.renderAll();
                // this.onToggleDrawingMode() 
            }
        }
    }

    onImageLoaded(event) {
        const { image, originalWidth, originalHeight, scaleFactor } = event;

        this.imageObject = image;
        this.imageOriginalWidth = originalWidth;
        this.imageOriginalHeight = originalHeight;
        this.imageScaleFactor = scaleFactor;

        this.imageObject.on('modified', this.onImageModified);

        if (!this.isSubscribed) {
            this.unsubscribe = store.subscribe(this.handleStateChange);
            this.isSubscribed = true;
        }
        if (this.clearMasksOnImageLoaded) {
            this.masks.forEach(mask => {
                this.canvas.remove(mask.fabricImage);
            });
            this.masks = [];
            this.currentMask = null;
            this.maskList.options.length = 0;

            this.maskStrokeHistory = {};

            this.onAddMask();
            // if (!this.drawingMode) {
            //     this.disableDrawingMode();
            // }
        } else {
            this.masks.forEach(mask => {
                this.canvas.remove(mask.fabricImage);
                mask.fabricImage = new fabric.Image(mask.canvasEl, {
                    left: this.imageObject.left,
                    top: this.imageObject.top,
                    originX: this.imageObject.originX,
                    originY: this.imageObject.originY,
                    selectable: false,
                    evented: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    lockRotation: true,
                    lockScalingX: true,
                    lockScalingY: true,
                    hasControls: false,
                    hasBorders: false,
                    hoverCursor: 'default',
                    opacity: this.brushOpacity,
                    scaleX: this.imageObject.scaleX,
                    scaleY: this.imageObject.scaleY,
                    willReadFrequently: true,
                });
                this.canvas.add(mask.fabricImage);
                mask.fabricImage.bringToFront();

                if (this.hideMaskCheckbox.checked) {
                    this.currentMask.visible  = false
                    this.currentMask.fabricImage.visible = this.currentMask.visible
                    this.canvas.renderAll();
                    // console.log('---Current state--- hideMask true', state.hideMask);
                    // this.onToggleDrawingMode() 

                }
                else if (this.hideMaskCheckbox.checked === false) {
                    // console.log('---Current state--- false', state.hideMask);
                    // this.hideMaskCheckbox.checked = false;
                    // this.canvas.renderAll();
                }                
            });

            if (this.masks.length > 0) {
                if (!this.currentMask || !this.masks.includes(this.currentMask)) {
                    this.currentMask = this.masks[0];
                }
                this.maskList.value = this.currentMask.name;
                this.updateBrushColorAndCursor();
            } else {
                this.onAddMask();
            }
            this.canvas.renderAll();
        }
    }

    onImageModified() {
        if (!this.imageObject) {
            console.error('Image object is not defined.');
            return;
        }

        this.masks.forEach(mask => {
            mask.fabricImage.set({
                scaleX: this.imageObject.scaleX,
                scaleY: this.imageObject.scaleY,
                left: this.imageObject.left,
                top: this.imageObject.top,
                originX: this.imageObject.originX,
                originY: this.imageObject.originY,
            });
            mask.fabricImage.setCoords();
        });
        this.canvas.renderAll();
    }

    onCanvasStateChanged() {
        this.masks.forEach(mask => {
            if (mask.fabricImage) {
                mask.fabricImage.selectable = !this.drawingMode;
                mask.fabricImage.evented = !this.drawingMode;
            }
        });
        this.canvas.renderAll();
    }

    onAddMask() {
        if (!this.imageObject) {
            alert('Please load an image before adding masks.');
            return;
        }

        const maskName = `Mask ${this.maskList.options.length + 1}`;
        const color = this.brushColor;

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = this.imageOriginalWidth;
        maskCanvas.height = this.imageOriginalHeight;
        const maskCtx = maskCanvas.getContext('2d');

        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

        const maskFabricImage = new fabric.Image(maskCanvas, {
            left: this.imageObject.left,
            top: this.imageObject.top,
            originX: this.imageObject.originX,
            originY: this.imageObject.originY,
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
            lockRotation: true,
            lockScalingX: true,
            lockScalingY: true,
            hasControls: false,
            hasBorders: false,
            hoverCursor: 'default',
            opacity: this.brushOpacity,
            scaleX: this.imageObject.scaleX,
            scaleY: this.imageObject.scaleY,
            willReadFrequently: true,
        });

        this.canvas.add(maskFabricImage);
        maskFabricImage.bringToFront();

        const mask = {
            name: maskName,
            color: color,
            fabricImage: maskFabricImage,
            canvasEl: maskCanvas,
            ctx: maskCtx,
            visible: true,
        };

        this.masks.push(mask);
        this.currentMask = mask;

        this.maskStrokeHistory[maskName] = {
            undoStack: [],
            redoStack: []
        };

        const option = document.createElement('option');
        option.value = maskName;
        option.text = maskName;
        option.dataset.color = color;
        this.maskList.add(option);
        this.maskList.value = maskName;
        this.updateBrushColorAndCursor();
    }

    onChangeMask() {
        const selectedOption = this.maskList.options[this.maskList.selectedIndex];
        const maskName = selectedOption.value;
        const color = selectedOption.dataset.color;

        this.currentMask = this.masks.find(m => m.name === maskName);
        this.brushColor = color;

        this.colorPicker.value = color;

        this.hideMaskCheckbox.checked = !this.currentMask.visible;

        this.updateBrushColorAndCursor();
    }

    onChangeMaskColor() {
        const color = this.brushColor = this.colorPicker.value;
        const selectedOption = this.maskList.options[this.maskList.selectedIndex];
        if (selectedOption) {
            selectedOption.dataset.color = color;
        }

        const applyToExistingMask = this.applyColorToMaskCheckbox.checked;

        if (this.currentMask) {
            this.currentMask.color = color;

            if (applyToExistingMask) {
                this.applyColorToExistingMask(this.currentMask, color);
                this.canvas.renderAll();
            }

            this.updateBrushColorAndCursor();
        }
    }

    applyColorToExistingMask(mask, newColor) {
        if (!mask || !mask.ctx) {
            console.error('Cannot apply color: mask or its context is null.');
            return;
        }

        const ctx = mask.ctx;
        const canvasEl = mask.canvasEl;
        const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
        const data = imageData.data;

        const tempElem = document.createElement('div');
        tempElem.style.color = newColor;
        document.body.appendChild(tempElem);
        const rgbColor = window.getComputedStyle(tempElem).color;
        document.body.removeChild(tempElem);

        const rgbMatch = rgbColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!rgbMatch) {
            console.error('Failed to parse new color.');
            return;
        }

        const rNew = parseInt(rgbMatch[1]);
        const gNew = parseInt(rgbMatch[2]);
        const bNew = parseInt(rgbMatch[3]);

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha > 0) {
                data[i] = rNew;
                data[i + 1] = gNew;
                data[i + 2] = bNew;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        mask.fabricImage.dirty = true;
    }

    onApplyColorToExistingMaskChange() {
    }

    onMoveMaskUp() {
        const index = this.maskList.selectedIndex;
        if (index > 0) {
            const option = this.maskList.options[index];
            this.maskList.remove(index);
            this.maskList.add(option, index - 1);
            this.maskList.selectedIndex = index - 1;

            const mask = this.masks.splice(index, 1)[0];
            this.masks.splice(index - 1, 0, mask);

            const imageIndex = this.canvas.getObjects().indexOf(this.imageObject);
            const newZIndex = imageIndex + 1 + (index - 1);
            this.canvas.moveTo(mask.fabricImage, newZIndex);
            this.canvas.renderAll();
        }
    }

    onMoveMaskDown() {
        const index = this.maskList.selectedIndex;
        if (index < this.maskList.options.length - 1) {
            const option = this.maskList.options[index];
            this.maskList.remove(index);
            this.maskList.add(option, index + 1);
            this.maskList.selectedIndex = index + 1;

            const mask = this.masks.splice(index, 1)[0];
            this.masks.splice(index + 1, 0, mask);

            const imageIndex = this.canvas.getObjects().indexOf(this.imageObject);
            const newZIndex = imageIndex + 1 + (index + 1);
            this.canvas.moveTo(mask.fabricImage, newZIndex);
            this.canvas.renderAll();
        }
    }

    onRemoveMask() {
        if (this.masks.length === 0) {
            alert('No masks available to remove.');
            return;
        }

        const selectedIndex = this.maskList.selectedIndex;
        if (selectedIndex === -1) {
            alert('Please select a mask to remove.');
            return;
        }

        const maskName = this.maskList.options[selectedIndex].value;
        const mask = this.masks.find(m => m.name === maskName);

        if (!mask) {
            alert('Selected mask not found.');
            return;
        }

        const confirmRemoval = confirm(`Are you sure you want to remove "${maskName}"?`);
        if (!confirmRemoval) {
            return;
        }

        this.canvas.remove(mask.fabricImage);

        this.masks = this.masks.filter(m => m.name !== maskName);

        delete this.maskStrokeHistory[maskName];

        this.maskList.remove(selectedIndex);

        if (this.masks.length > 0) {
            const newIndex = selectedIndex > 0 ? selectedIndex - 1 : 0;
            this.maskList.selectedIndex = newIndex;
            this.currentMask = this.masks[newIndex];

            this.hideMaskCheckbox.checked = !this.currentMask.visible;

        } else {
            this.currentMask = null;
            this.hideMaskCheckbox.checked = false;
        }

        this.updateBrushColorAndCursor();

        this.canvas.renderAll();
    }

    onClearMask() {
        if (!this.currentMask) {
            alert('No mask selected to clear.');
            return;
        }

        const confirmClear = confirm(`Are you sure you want to clear "${this.currentMask.name}"?`);
        if (!confirmClear) {
            return;
        }

        this.currentMask.ctx.clearRect(0, 0, this.currentMask.canvasEl.width, this.currentMask.canvasEl.height);
        this.currentMask.fabricImage.dirty = true;
        this.canvas.renderAll();

        this.maskStrokeHistory[this.currentMask.name] = {
            undoStack: [],
            redoStack: []
        };
    }

    onClearAllMasks() {
        // const confirmClearAll = confirm('Are you sure you want to clear all masks?');
        // if (!confirmClearAll) {
        //     return;
        // }

        this.masks.forEach(mask => {
            mask.ctx.clearRect(0, 0, mask.canvasEl.width, mask.canvasEl.height);
            mask.fabricImage.dirty = true;

            this.maskStrokeHistory[mask.name] = {
                undoStack: [],
                redoStack: []
            };
        });
        this.canvas.renderAll();
    }

    onToggleHideMask() {
        if (!this.currentMask) {
            this.hideMaskCheckbox.checked = false;
            return;
        }

        this.currentMask.visible = !this.hideMaskCheckbox.checked;
        this.currentMask.fabricImage.visible = this.currentMask.visible;
        this.canvas.renderAll();
    }

    onToggleHideAllMasks() {
        const hideAll = this.hideAllMasksCheckbox.checked;
        this.masks.forEach(mask => {
            mask.visible = !hideAll;
            mask.fabricImage.visible = mask.visible;
        });
        if (this.currentMask) {
            this.hideMaskCheckbox.checked = !this.currentMask.visible;
        }
        this.canvas.renderAll();
    }

    updateBrushColorAndCursor() {
        if (this.currentMask) {
            this.brushColor = this.currentMask.color;
            this.updateCursorCircle();
            this.canvas.requestRenderAll();
        } else {
            this.brushColor = '#FF0000';
            this.updateCursorCircle();
            this.canvas.requestRenderAll();
        }
    }

    onMouseDown(o) {
        if (!this.currentMask || !this.currentMask.ctx) {
            console.error('Cannot draw: currentMask or its context is null.');
            return;
        }

        this.isMouseDown = true;
        this.isStrokeInProgress = true;

        const pointer = this.canvas.getPointer(o.e, true);
        const transformedPointer = this.mapPointerToImageSpace(pointer);

        if (!this.isPointerInsideImage(transformedPointer)) {
            this.isMouseDown = false;
            this.isStrokeInProgress = false;
            return;
        }

        this.lastPointer = transformedPointer;

        const imageDataBefore = this.currentMask.ctx.getImageData(0, 0, this.currentMask.canvasEl.width, this.currentMask.canvasEl.height);
        this.maskStrokeHistory[this.currentMask.name].undoStack.push(imageDataBefore);
        if (this.maskStrokeHistory[this.currentMask.name].undoStack.length > this.maxHistory) {
            this.maskStrokeHistory[this.currentMask.name].undoStack.shift();
        }

        this.maskStrokeHistory[this.currentMask.name].redoStack = [];

        this.drawOnMask(transformedPointer);
    }

    onMouseMove(o) {
        if (!this.currentMask || !this.currentMask.ctx) {
            console.warn('Cannot draw: currentMask or its context is null.');
            // return;
        }

        const pointer = this.canvas.getPointer(o.e, true);
        const transformedPointer = this.mapPointerToImageSpace(pointer);

        this.updateCursorPosition(o);

        if (this.isMouseDown && this.isStrokeInProgress) {
            if (!this.isPointerInsideImage(transformedPointer)) {
                return;
            }

            this.drawLineOnMask(this.lastPointer, transformedPointer);
            this.lastPointer = transformedPointer;
        }

        this.canvas.requestRenderAll();
    }

    onMouseUp() {
        if (this.isMouseDown) {
            this.isMouseDown = false;
            this.isStrokeInProgress = false;
        }
    }

    onUndoMaskStroke(strokeData) {
        if (strokeData.type === 'add') {
            this.undoLastStroke(strokeData.maskName);
        }
    }

    onRedoMaskStroke(strokeData) {
        if (strokeData.type === 'add') {
            this.redoLastStroke(strokeData.maskName, strokeData);
        }
    }

    undoLastStroke(maskName) {
        const history = this.maskStrokeHistory[maskName];
        if (!history || history.undoStack.length === 0) {
            console.warn(`No undo actions available for mask "${maskName}".`);
            return;
        }

        const lastState = history.undoStack.pop();

        const currentState = this.currentMask.ctx.getImageData(0, 0, this.currentMask.canvasEl.width, this.currentMask.canvasEl.height);
        history.redoStack.push(currentState);

        this.currentMask.ctx.putImageData(lastState, 0, 0);
        this.currentMask.fabricImage.dirty = true;
        this.canvas.renderAll();
    }

    redoLastStroke(maskName, strokeData) {
        const history = this.maskStrokeHistory[maskName];
        if (!history || history.redoStack.length === 0) {
            console.warn(`No redo actions available for mask "${maskName}".`);
            return;
        }

        const redoState = history.redoStack.pop();
        const currentState = this.currentMask.ctx.getImageData(0, 0, this.currentMask.canvasEl.width, this.currentMask.canvasEl.height);
        history.undoStack.push(currentState);

        this.currentMask.ctx.putImageData(redoState, 0, 0);
        this.currentMask.fabricImage.dirty = true;
        this.canvas.renderAll();
    }

    mapPointerToImageSpace(pointer) {
        if (!this.imageObject) {
            console.error('Image object is not defined.');
            return { x: 0, y: 0 };
        }

        const img = this.imageObject;
        const viewportTransform = this.canvas.viewportTransform;
        const invViewportTransform = fabric.util.invertTransform(viewportTransform);

        const canvasPoint = new fabric.Point(pointer.x, pointer.y);

        const imagePoint = fabric.util.transformPoint(canvasPoint, invViewportTransform);
        const relativeX = (imagePoint.x - img.left) / img.scaleX + (this.imageOriginalWidth / 2);
        const relativeY = (imagePoint.y - img.top) / img.scaleY + (this.imageOriginalHeight / 2);

        return { x: relativeX, y: relativeY };
    }

    isPointerInsideImage(point) {
        return (
            point.x >= 0 &&
            point.x <= this.imageOriginalWidth &&
            point.y >= 0 &&
            point.y <= this.imageOriginalHeight
        );
    }

    drawOnMask(point) {
        if (!this.imageObject) {
            console.error('Image object is not defined.');
            return;
        }
        this.currentMask.ctx.globalAlpha = 1;

        const adjustedBrushSize = this.brushSize / (this.currentZoom * this.imageObject.scaleX);

        this.currentMask.ctx.fillStyle = this.brushColor;
        this.currentMask.ctx.beginPath();
        this.currentMask.ctx.arc(point.x, point.y, adjustedBrushSize / 2, 0, Math.PI * 2);
        this.currentMask.ctx.fill();
        this.currentMask.fabricImage.dirty = true;

        const strokeData = {
            type: 'add',
            maskName: this.currentMask.name,
            color: this.brushColor,
            position: { x: point.x, y: point.y },
            brushSize: adjustedBrushSize
        };
        this.canvasManager.emit('mask:stroke:added', strokeData);
    }

    drawLineOnMask(fromPoint, toPoint) {
        if (!this.imageObject) {
            console.error('Image object is not defined.');
            return;
        }

        this.currentMask.ctx.globalAlpha = 1;

        const adjustedBrushSize = this.brushSize / (this.currentZoom * this.imageObject.scaleX);

        this.currentMask.ctx.strokeStyle = this.brushColor;
        this.currentMask.ctx.lineWidth = adjustedBrushSize;
        this.currentMask.ctx.lineCap = 'round';
        this.currentMask.ctx.beginPath();
        this.currentMask.ctx.moveTo(fromPoint.x, fromPoint.y);
        this.currentMask.ctx.lineTo(toPoint.x, toPoint.y);
        this.currentMask.ctx.stroke();
        this.currentMask.fabricImage.dirty = true;

        const strokeData = {
            type: 'add',
            maskName: this.currentMask.name,
            color: this.brushColor,
            from: { x: fromPoint.x, y: fromPoint.y },
            to: { x: toPoint.x, y: toPoint.y },
            brushSize: adjustedBrushSize
        };
        this.canvasManager.emit('mask:stroke:added', strokeData);
    }

    onHandleSave() {
        const selectedOption = this.saveOptionsSelect.value;

        const option = this.saveOptions.find(opt => opt.value === selectedOption);
        if (option && option.handler) {
            option.handler();
        } else {
            console.error('Unknown save option selected.');
        }
    }

    onHandleSaveFromCanvas(selectedOption) {
        const option = this.saveOptions.find(opt => opt.value === selectedOption);
        if (option && option.handler) {
            option.handler();
        } else {
            console.error('Unknown save option selected.');
        }
    }

    getExportFunction(optionValue) {
        return this.saveOptions.find(opt => opt.value === optionValue)?.exportFunction || null;
    }

    destroy() {
        this.detachAdditionalEventListeners();

        this.masks.forEach(mask => {
            this.canvas.remove(mask.fabricImage);
        });
        this.masks = [];
        this.currentMask = null;

        if (this.imageObject) {
            this.imageObject.off('modified', this.onImageModified);
        }

        this.canvasManager.off('undo:mask:stroke', this.onUndoMaskStroke);
        this.canvasManager.off('redo:mask:stroke', this.onRedoMaskStroke);
        this.canvasManager.off('pan:activated', this.onPanActivated);
        this.canvasManager.off('pan:deactivated', this.onPanDeactivated);

        if (this.unsubscribe) {
            this.unsubscribe();
            this.isSubscribed = false;
        }
        super.destroy();
    }
}
