import { CustomBrushPlugin } from './CustomBrushPlugin.js';

export class MaskBrushPlugin extends CustomBrushPlugin {
    constructor(options = {}) {
        super({ ...options, name: 'MaskBrushPlugin' });

        this.masks = [];
        this.currentMask = null;
        this.maskStrokeHistory = {}; // { maskName: { undoStack: [], redoStack: [] } }
        this.brushIcon = '/core/media/ui/double-face-mask.png';

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
    }

    init(canvasManager) {
        super.init(canvasManager);
        
        if (this.brushOpacityInput && this.brushOpacityInput.parentElement) {
            this.brushOpacityInput.parentElement.style.display = 'none';
        }

        this.extendUI();

        this.attachAdditionalEventListeners();

        this.canvasManager.on('image:loaded', this.onImageLoaded);
        this.canvasManager.on('canvas:state:changed', this.onCanvasStateChanged);
        this.canvasManager.on('undo:mask:stroke', this.onUndoMaskStroke);
        this.canvasManager.on('redo:mask:stroke', this.onRedoMaskStroke);

        window.addEventListener('resize', this.onWindowResize);

        this.canvasManager.on('save:trigger', this.onHandleSaveFromCanvas);
    }

    extendUI() {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
        
        `;
        document.head.appendChild(styleSheet);

        const temp = document.createElement('div');
        temp.innerHTML = `
            <div class="mbp-container">
                    <div class="mbp-toggle-wrapper">
                    <label for="applyColorToMaskCheckbox" class="mbp-label">Mask Color Fill</label>
                    <label class="mbp-toggle" for="applyColorToMaskCheckbox">
                        <input type="checkbox" id="applyColorToMaskCheckbox">
                        <span class="mbp-toggle-slider"></span>
                    </label>
                    </div>     
                <div class="mbp-header">
                    <select id="maskList" class="mbp-select">
                        <option value="" disabled selected>Select a mask</option>
                    </select>
                </div>
                

                <div class="mbp-button-group">
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
                    <label for="" class="mbp-label">Mask Order</label>
                <div class="mbp-button-group">
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

                
                <select id="saveOptionsSelect" class="mbp-select">
                </select>
                
                <button id="saveMaskBtn" class="mbp-button" style="width: 100%;" title="Save Mask">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                </button>
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
        this.saveOptionsSelect = this.uiContainer.querySelector('#saveOptionsSelect');
        this.saveMaskBtn = this.uiContainer.querySelector('#saveMaskBtn');

        this.saveOptions = [
            {
                value: 'saveMaskAlphaOnImage',
                text: 'Mask As Alpha on Image',
                handler: () => this.saveMaskAlphaOnImage(),
                exportFunction: () => this.exportMaskAlphaOnImage(),
                show: true,
            },
            {
                value: 'saveAllMasksAlphaOnImage',
                text: 'All Masks As Alpha on Image',
                handler: () => this.saveAllMasksAlphaOnImage(),
                exportFunction: () => this.exportAllMasksAlphaOnImage(),
                show: true,
            },
            {
                value: 'saveAllMasksCombinedAlphaOnImage',
                text: 'All Masks As Alpha Combined on Image',
                handler: () => this.saveAllMasksCombinedAlphaOnImage(),
                exportFunction: () => this.exportAllMasksCombinedAlphaOnImage(),
                show: true,
            },
            {
                value: 'saveMask',
                text: 'Mask',
                handler: () => this.saveMask(),
                exportFunction: () => this.exportMask(),
                show: true,
            },
            {
                value: 'saveAllMasks',
                text: 'All Masks',
                handler: () => this.saveAllMasks(),
                exportFunction: () => this.exportMasksImage(),
                show: true,
            },
            {
                value: 'saveAllMasksCombined',
                text: 'All Masks Combined',
                handler: () => this.saveAllMasksCombined(),
                exportFunction: () => this.exportAllMasksCombined(),
                show: true,
            },
            {
                value: 'saveAllMasksCombinedBW',
                text: 'All Masks Combined (B&W)',
                handler: () => this.saveAllMasksCombinedBlackWhite(),
                exportFunction: () => this.exportMasksCombinedBlackWhite(),
                show: true,
            },
            {
                value: 'saveMaskOnImage',
                text: 'Mask on Image',
                handler: () => this.saveMaskOnImage(),
                exportFunction: () => this.exportMaskOnImage(),
                show: true,
            },
            {
                value: 'saveAllMasksOnImage',
                text: 'All Masks on Image',
                handler: () => this.saveAllMasksOnImage(),
                exportFunction: () => this.exportAllMasksOnImage(),
                show: true,
            },
            {
                value: 'saveAllMasksCombinedOnImage',
                text: 'All Masks Combined on Image',
                handler: () => this.saveAllMasksCombinedOnImage(),
                exportFunction: () => this.exportAllMasksCombinedOnImage(),
                show: true,
            },
            {
                value: 'saveAllMasksCombinedBWOnImage',
                text: 'All Masks Combined (B&W) on Image',
                handler: () => this.saveAllMasksCombinedBlackWhiteOnImage(),
                exportFunction: () => this.exportAllMasksCombinedBlackWhiteOnImage(),
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

        this.saveMaskBtn.removeEventListener('click', this.onHandleSave);

        this.canvasManager.off('image:loaded', this.onImageLoaded);
        this.canvasManager.off('canvas:state:changed', this.onCanvasStateChanged);
        this.canvasManager.off('undo:mask:stroke', this.onUndoMaskStroke);
        this.canvasManager.off('redo:mask:stroke', this.onRedoMaskStroke);

        window.removeEventListener('resize', this.onWindowResize);

        this.canvasManager.off('save:trigger', this.onHandleSaveFromCanvas);
    }

    onWindowResize() {
        if (typeof this.onImageModified === 'function') {
            this.onImageModified();
        } else {
            console.error('onImageModified method is not defined or not bound correctly.');
        }
    }

    onImageLoaded(event) {
        const { image, originalWidth, originalHeight, scaleFactor } = event;

        this.imageObject = image;
        this.imageOriginalWidth = originalWidth;
        this.imageOriginalHeight = originalHeight;
        this.imageScaleFactor = scaleFactor;

        this.imageObject.on('modified', this.onImageModified);

        this.masks.forEach(mask => {
            this.canvas.remove(mask.fabricImage);
        });
        this.masks = [];
        this.currentMask = null;
        this.maskList.options.length = 0;

        this.maskStrokeHistory = {};

        this.onAddMask();
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
                data[i] = rNew;     // Red
                data[i + 1] = gNew; // Green
                data[i + 2] = bNew; // Blue
            }
        }

        ctx.putImageData(imageData, 0, 0);
        mask.fabricImage.dirty = true;
    }

    onApplyColorToExistingMaskChange() {
        //can be used if additional actions are needed when the checkbox state changes
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
        } else {
            this.currentMask = null;
        }

        this.updateBrushColorAndCursor();

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
            console.error('Cannot draw: currentMask or its context is null.');
            return;
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
        console.log('MaskBrushPlugin: Undoing mask stroke', strokeData);
        if (strokeData.type === 'add') {
            this.undoLastStroke(strokeData.maskName);
        }
    }

    onRedoMaskStroke(strokeData) {
        console.log('MaskBrushPlugin: Redoing mask stroke', strokeData);
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

    createCombinedAlphaMask() {
        const alphaCanvas = document.createElement('canvas');
        alphaCanvas.width = this.imageOriginalWidth;
        alphaCanvas.height = this.imageOriginalHeight;
        const alphaCtx = alphaCanvas.getContext('2d');

        alphaCtx.clearRect(0, 0, alphaCanvas.width, alphaCanvas.height);
        this.masks.forEach(mask => {
            alphaCtx.drawImage(mask.canvasEl, 0, 0, alphaCanvas.width, alphaCanvas.height);
        });

        return alphaCanvas;
    }

    exportMaskAlphaOnImage() {
        if (!this.imageObject) {
            alert('No image loaded to save the alpha on.');
            return null;
        }

        if (!this.currentMask) {
            alert('No mask selected to save as alpha.');
            return null;
        }

        try {
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = this.imageOriginalWidth;
            combinedCanvas.height = this.imageOriginalHeight;
            const combinedCtx = combinedCanvas.getContext('2d');

            combinedCtx.drawImage(this.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);

            const alphaMask = document.createElement('canvas');
            alphaMask.width = this.imageOriginalWidth;
            alphaMask.height = this.imageOriginalHeight;
            const alphaCtx = alphaMask.getContext('2d');
            alphaCtx.drawImage(this.currentMask.canvasEl, 0, 0, alphaMask.width, alphaMask.height);

            combinedCtx.globalCompositeOperation = 'destination-out';
            combinedCtx.drawImage(alphaMask, 0, 0, combinedCanvas.width, combinedCanvas.height);
            combinedCtx.globalCompositeOperation = 'source-over';

            const combinedDataURL = combinedCanvas.toDataURL('image/png');
            return combinedDataURL;

        } catch (error) {
            console.error('Error saving single mask alpha on image:', error);
            alert('An error occurred while saving the single mask alpha on image.');
            return null;
        }
    }

    exportAllMasksAlphaOnImage() {
        if (!this.imageObject) {
            alert('No image loaded to save the alphas on.');
            return null;
        }

        if (this.masks.length === 0) {
            alert('No masks available to save as alphas.');
            return null;
        }

        try {
            const dataURLs = this.masks.map(mask => {
                const combinedCanvas = document.createElement('canvas');
                combinedCanvas.width = this.imageOriginalWidth;
                combinedCanvas.height = this.imageOriginalHeight;
                const combinedCtx = combinedCanvas.getContext('2d');

                combinedCtx.drawImage(this.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);

                const alphaMask = document.createElement('canvas');
                alphaMask.width = this.imageOriginalWidth;
                alphaMask.height = this.imageOriginalHeight;
                const alphaCtx = alphaMask.getContext('2d');
                alphaCtx.drawImage(mask.canvasEl, 0, 0, alphaMask.width, alphaMask.height);

                combinedCtx.globalCompositeOperation = 'destination-out';
                combinedCtx.drawImage(alphaMask, 0, 0, combinedCanvas.width, combinedCanvas.height);
                combinedCtx.globalCompositeOperation = 'source-over';

                return {
                    dataURL: combinedCanvas.toDataURL('image/png'),
                    filename: `${mask.name}_alpha_on_image.png`
                };
            });

            return dataURLs;

        } catch (error) {
            console.error('Error saving all masks alphas on image:', error);
            alert('An error occurred while saving all masks alphas on image.');
            return null;
        }
    }

    exportAllMasksCombinedAlphaOnImage() {
        if (!this.imageObject) {
            alert('No image loaded to save the combined alpha on.');
            return null;
        }

        if (this.masks.length === 0) {
            alert('No masks available to save as combined alpha.');
            return null;
        }

        try {
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = this.imageOriginalWidth;
            combinedCanvas.height = this.imageOriginalHeight;
            const combinedCtx = combinedCanvas.getContext('2d');

            combinedCtx.drawImage(this.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);

            const alphaMask = this.createCombinedAlphaMask();

            combinedCtx.globalCompositeOperation = 'destination-out';
            combinedCtx.drawImage(alphaMask, 0, 0, combinedCanvas.width, combinedCanvas.height);
            combinedCtx.globalCompositeOperation = 'source-over'; 

            const combinedDataURL = combinedCanvas.toDataURL('image/png');
            return combinedDataURL;

        } catch (error) {
            console.error('Error saving combined masks alpha on image:', error);
            alert('An error occurred while saving the combined masks alpha on image.');
            return null;
        }
    }

    //Mask
    exportMask() {
        if (!this.currentMask) {
            alert('No mask selected to export.');
            return null;
        }

        try {
            const dataURL = this.currentMask.canvasEl.toDataURL('image/png');
            return dataURL;
        } catch (error) {
            console.error('Error exporting single mask image:', error);
            alert('An error occurred while exporting the single mask image.');
            return null;
        }
    }

    exportAllMasks() {
        if (!this.imageObject) {
            alert('No image loaded to export masks on.');
            return null;
        }

        if (this.masks.length === 0) {
            alert('No masks available to export on image.');
            return null;
        }

        const combinedCanvas = document.createElement('canvas');
        combinedCanvas.width = this.imageOriginalWidth;
        combinedCanvas.height = this.imageOriginalHeight;
        const combinedCtx = combinedCanvas.getContext('2d');

        combinedCtx.drawImage(this.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);

        this.masks.forEach(mask => {
            combinedCtx.drawImage(mask.canvasEl, 0, 0, combinedCanvas.width, combinedCanvas.height);
        });

        const combinedDataURL = combinedCanvas.toDataURL('image/png');
        return combinedDataURL;
    }

    exportAllMasksCombined() {
        if (this.masks.length === 0) {
            alert('No masks available to export.');
            return null;
        }

        try {
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = this.imageOriginalWidth;
            combinedCanvas.height = this.imageOriginalHeight;
            const combinedCtx = combinedCanvas.getContext('2d');
            this.masks.forEach(mask => {
                combinedCtx.drawImage(mask.canvasEl, 0, 0, combinedCanvas.width, combinedCanvas.height);
            });

            const combinedDataURL = combinedCanvas.toDataURL('image/png');
            return combinedDataURL;
        } catch (error) {
            console.error('Error exporting combined masks image:', error);
            alert('An error occurred while exporting the combined masks image.');
            return null;
        }
    }

    exportMasksCombinedBlackWhite() {
        if (this.masks.length === 0) {
            alert('No masks available to export.');
            return null;
        }

        const combinedCanvas = document.createElement('canvas');
        combinedCanvas.width = this.imageOriginalWidth;
        combinedCanvas.height = this.imageOriginalHeight;
        const combinedCtx = combinedCanvas.getContext('2d');

        combinedCtx.fillStyle = 'black';
        combinedCtx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

        this.masks.forEach(mask => {
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = this.imageOriginalWidth;
            maskCanvas.height = this.imageOriginalHeight;
            const maskCtx = maskCanvas.getContext('2d');

            maskCtx.drawImage(mask.canvasEl, 0, 0, maskCanvas.width, maskCanvas.height);

            const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                if (alpha > 0) {
                    data[i] = 255;    
                    data[i + 1] = 255; 
                    data[i + 2] = 255;
                }
            }

            maskCtx.putImageData(imageData, 0, 0);

            combinedCtx.drawImage(maskCanvas, 0, 0, combinedCanvas.width, combinedCanvas.height);
        });

        const combinedDataURL = combinedCanvas.toDataURL('image/png');
        return combinedDataURL;
    }

    //Mask on image
    exportMaskOnImage() {
        if (!this.imageObject) {
            alert('No image loaded to export mask on.');
            return null;
        }

        if (!this.currentMask) {
            alert('No mask selected to export on image.');
            return null;
        }

        try {
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = this.imageOriginalWidth;
            combinedCanvas.height = this.imageOriginalHeight;
            const combinedCtx = combinedCanvas.getContext('2d');

            combinedCtx.drawImage(this.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);

            combinedCtx.drawImage(this.currentMask.canvasEl, 0, 0, combinedCanvas.width, combinedCanvas.height);

            const combinedDataURL = combinedCanvas.toDataURL('image/png');
            return combinedDataURL;
        } catch (error) {
            console.error('Error exporting single mask on image:', error);
            alert('An error occurred while exporting the single mask on image.');
            return null;
        }
    }

    exportAllMasksOnImage() {
        if (!this.imageObject) {
            alert('No image loaded to export masks on.');
            return null;
        }

        if (this.masks.length === 0) {
            alert('No masks available to export on image.');
            return null;
        }

        try {
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = this.imageOriginalWidth;
            combinedCanvas.height = this.imageOriginalHeight;
            const combinedCtx = combinedCanvas.getContext('2d');

            combinedCtx.drawImage(this.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);

            this.masks.forEach(mask => {
                combinedCtx.drawImage(mask.canvasEl, 0, 0, combinedCanvas.width, combinedCanvas.height);
            });

            const combinedDataURL = combinedCanvas.toDataURL('image/png');
            return combinedDataURL;
        } catch (error) {
            console.error('Error exporting all masks on image:', error);
            alert('An error occurred while exporting all masks on image.');
            return null;
        }
    }

    exportAllMasksCombinedOnImage() {
        if (!this.imageObject) {
            alert('No image loaded to export combined masks on.');
            return null;
        }

        if (this.masks.length === 0) {
            alert('No masks available to export combined on image.');
            return null;
        }

        try {
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = this.imageOriginalWidth;
            combinedCanvas.height = this.imageOriginalHeight;
            const combinedCtx = combinedCanvas.getContext('2d');

            combinedCtx.drawImage(this.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);

            const combinedMaskCanvas = this.createCombinedAlphaMask();
            combinedCtx.drawImage(combinedMaskCanvas, 0, 0, combinedCanvas.width, combinedCanvas.height);

            const combinedDataURL = combinedCanvas.toDataURL('image/png');
            return combinedDataURL;
        } catch (error) {
            console.error('Error exporting combined masks on image:', error);
            alert('An error occurred while exporting combined masks on image.');
            return null;
        }
    }

    exportAllMasksCombinedBlackWhiteOnImage() {
        if (!this.imageObject) {
            alert('No image loaded to export masks on.');
            return null;
        }

        if (this.masks.length === 0) {
            alert('No masks available to export on image.');
            return null;
        }

        const combinedCanvas = document.createElement('canvas');
        combinedCanvas.width = this.imageOriginalWidth;
        combinedCanvas.height = this.imageOriginalHeight;
        const combinedCtx = combinedCanvas.getContext('2d');

        combinedCtx.drawImage(this.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);

        const tempMasksCanvas = document.createElement('canvas');
        tempMasksCanvas.width = this.imageOriginalWidth;
        tempMasksCanvas.height = this.imageOriginalHeight;
        const tempMasksCtx = tempMasksCanvas.getContext('2d');

        tempMasksCtx.fillStyle = 'black';
        tempMasksCtx.fillRect(0, 0, tempMasksCanvas.width, tempMasksCanvas.height);

        this.masks.forEach(mask => {
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = this.imageOriginalWidth;
            maskCanvas.height = this.imageOriginalHeight;
            const maskCtx = maskCanvas.getContext('2d');

            maskCtx.drawImage(mask.canvasEl, 0, 0, maskCanvas.width, maskCanvas.height);

            const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                if (alpha > 0) {
                    data[i] = 255;     
                    data[i + 1] = 255;
                    data[i + 2] = 255;
                }
            }

            maskCtx.putImageData(imageData, 0, 0);

            tempMasksCtx.drawImage(maskCanvas, 0, 0, tempMasksCanvas.width, tempMasksCanvas.height);
        });

        combinedCtx.drawImage(tempMasksCanvas, 0, 0, combinedCanvas.width, combinedCanvas.height);

        const combinedDataURL = combinedCanvas.toDataURL('image/png');
        return combinedDataURL;
    }

    saveMaskAlphaOnImage() {
        const dataURL = this.exportMaskAlphaOnImage();
        if (dataURL) {
            this.downloadImage(dataURL, `${this.currentMask.name}_alpha_on_image.png`);
        }
    }

    saveAllMasksAlphaOnImage() {
        const dataURLs = this.exportAllMasksAlphaOnImage();
        if (dataURLs) {
            dataURLs.forEach(({ dataURL, filename }) => {
                this.downloadImage(dataURL, filename);
            });
        }
    }

    saveAllMasksCombinedAlphaOnImage() {
        const dataURL = this.exportAllMasksCombinedAlphaOnImage();
        if (dataURL) {
            this.downloadImage(dataURL, 'combined_masks_alpha_on_image.png');
        }
    }

    saveMask() {
        if (this.currentMask && this.currentMask.canvasEl) {
            const dataURL = this.exportMask();
            if (dataURL) {
                this.downloadImage(dataURL, `${this.currentMask.name}.png`);
            }
        } else {
            alert('No current mask data available to save.');
        }
    }

    saveAllMasks() {
        if (this.masks.length > 0) {
            this.masks.forEach((mask) => {
                const dataURL = mask.canvasEl.toDataURL('image/png');
                this.downloadImage(dataURL, `${mask.name}.png`);
            });
        } else {
            alert('No mask data available to save.');
        }
    }

    saveAllMasksCombined() {
        const combinedDataURL = this.exportAllMasksCombined();
        if (combinedDataURL) {
            this.downloadImage(combinedDataURL, 'combined_masks.png');
        }
    }

    saveAllMasksCombinedBlackWhite() {
        const combinedDataURL = this.exportMasksCombinedBlackWhite();
        if (combinedDataURL) {
            this.downloadImage(combinedDataURL, 'combined_masks_black_white.png');
        }
    }

    saveMaskOnImage() {
        const dataURL = this.exportMaskOnImage();
        if (dataURL) {
            this.downloadImage(dataURL, `${this.currentMask.name}_on_image.png`);
        }
    }

    saveAllMasksOnImage() {
        const dataURL = this.exportAllMasksOnImage();
        if (dataURL) {
            this.downloadImage(dataURL, 'all_masks_on_image.png');
        }
    }

    saveAllMasksCombinedOnImage() {
        const dataURL = this.exportAllMasksCombinedOnImage();
        if (dataURL) {
            this.downloadImage(dataURL, 'combined_masks_on_image.png');
        }
    }

    saveAllMasksCombinedBlackWhiteOnImage() {
        const combinedDataURL = this.exportAllMasksCombinedBlackWhiteOnImage();
        if (combinedDataURL) {
            this.downloadImage(combinedDataURL, 'combined_masks_black_white_on_image.png');
        }
    }

    downloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

        super.destroy();
    }
}
