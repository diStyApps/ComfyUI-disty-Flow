import { CanvasPlugin } from './CanvasPlugin.js';
import { store } from  '../../scripts/stateManagerMain.js';

export class CustomBrushPlugin extends CanvasPlugin {
    constructor(options = {}) {
        super(options.name || 'CustomBrushPlugin');

        this.brushSize = options.brushSize || 25;
        this.minBrushSize = options.minBrushSize || 1;
        this.maxBrushSize = options.maxBrushSize || 500;
        this.brushColor = options.brushColor || '#000000';
        this.brushOpacity = options.brushOpacity !== undefined ? options.brushOpacity : 1;
        this.brushTipResizeSpeed = options.brushTipResizeSpeed || 1;
        this.cursorOutlineType = options.cursorOutlineType || 'dashed';
        this.cursorPrimaryColor = options.cursorPrimaryColor || '#000000';
        this.cursorSecondaryColor = options.cursorSecondaryColor || '#FFFFFF';
        this.cursorLineWidth = options.cursorLineWidth || 2;
        this.cursorFill = options.cursorFill !== undefined ? options.cursorFill : false;
        this.useBrushColorPrimaryColor = options.useBrushColorPrimaryColor || false;
        this.showSystemCursor = options.showSystemCursor !== undefined ? options.showSystemCursor : false;
        this.useBrushColorForCursorRing = options.useBrushColorForCursorRing !== undefined ? options.useBrushColorForCursorRing : false;
        this.cursorRingOpacityAffected = options.cursorRingOpacityAffected !== undefined ? options.cursorRingOpacityAffected : false;

        this.canvasManager = null;
        this.canvas = null;
        this.drawingMode = false;
        this.brushToggledByKey = false;
        this.isMouseDown = false;
        this.lastPointer = null;
        this.isMouseOverCanvas = false;

        this.currentPath = null;
        this.brushIcon = '/core/media/ui/paintree.png';

        this.originalCanvasProperties = null;

        this.cursorCircle = null;
        this.secondaryCircle = null;

        this.uiContainer = null;
        this.uiHeader = null;
        this.brushSizeInput = null;
        this.brushOpacityInput = null;
        this.colorPicker = null;
        this.toggleDrawBtn = null;
        this.minimizeBtn = null;
        this.isMinimized = false;
        this.currentMode = 'full'; // Modes: 'full', 'mini', 'minimized'

        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        this.drawnObjects = new Set();

        this.currentZoom = 1;

        this.hiddenCursorClass = 'custom-brush-plugin-hidden-cursor';

        this.onBrushSizeChange = this.onBrushSizeChange.bind(this);
        this.onBrushOpacityChange = this.onBrushOpacityChange.bind(this);
        this.onToggleDrawingMode = this.onToggleDrawingMode.bind(this);
        this.onColorChange = this.onColorChange.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.enforceObjectProperties = this.enforceObjectProperties.bind(this);
        this.onViewportChanged = this.onViewportChanged.bind(this);

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.handleMouseWheel = this.handleMouseWheel.bind(this);
        this.handleMouseOver = this.handleMouseOver.bind(this);
        this.handleMouseOut = this.handleMouseOut.bind(this);
        this.onObjectAdded = this.onObjectAdded.bind(this);
        this.onHeaderMouseDown = this.onHeaderMouseDown.bind(this);
        this.onDocumentMouseMove = this.onDocumentMouseMove.bind(this);
        this.onDocumentMouseUp = this.onDocumentMouseUp.bind(this);
        this.onMinimize = this.onMinimize.bind(this);
        this.onModeChange = this.onModeChange.bind(this);
        this.brushStrokeIdCounter = 0;
        this.disableDrawingMode = this.disableDrawingMode.bind(this);
        this.enableDrawingMode = this.enableDrawingMode.bind(this);
        this.onCanvasPointerEnter = this.onCanvasPointerEnter.bind(this);
        this.onCanvasPointerLeave = this.onCanvasPointerLeave.bind(this);
    }

    init(canvasManager) {
        this.canvasManager = canvasManager;
        this.canvas = canvasManager.canvas;

        this.storeOriginalCanvasProperties();

        this.disableSelectionBox();

        this.injectHiddenCursorCSS();

        this.createUI();

        // if (this.canvasElement) {
        //     if (this.canvasElement.tagName.toLowerCase() === 'canvas' && !this.canvasElement.hasAttribute('tabindex')) {
        //         this.canvasElement.setAttribute('tabindex', '0');
        //         // console.log('Set tabindex="0" on the canvas element to make it focusable.');
        //     }
        // }

        this.attachEventListeners();

        this.brushSizeInput.value = this.brushSize;
        this.brushOpacityInput.value = this.brushOpacity * 100;
        this.colorPicker.value = this.brushColor;

        this.canvas.on('object:added', this.onObjectAdded);

        this.canvas.getObjects().forEach(this.enforceObjectProperties);

        this.canvasManager.on('viewport:changed', this.onViewportChanged);
        this.canvasManager.on('pan:toggled', this.disableDrawingMode);
    }

    injectHiddenCursorCSS() {
        if (document.getElementById('custom-brush-plugin-styles')) return;

        const style = document.createElement('style');
        style.id = 'custom-brush-plugin-styles';
        style.type = 'text/css';
        style.innerHTML = `
 
        `;
        document.head.appendChild(style);
    }

    // Helper function to convert HEX to RGBA
    getFillColorWithOpacity(hex, alpha) {
        // Remove '#' if present
        hex = hex.replace('#', '');
        let r, g, b;
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else {
            // Invalid format
            return 'rgba(0,0,0,1)';
        }
        return `rgba(${r},${g},${b},${alpha})`;
    }

    isDrawnObject(obj) {
        return obj.type === 'path';
    }

    onObjectAdded(e) {
        const obj = e.target;
        if (obj && this.isDrawnObject(obj)) {
            this.enforceObjectProperties(obj);
        }
    }

    createUI() {
        this.uiContainer = document.createElement('div');
        this.uiContainer.className = 'cbp-brush-ui-container cbp-brush-ui-full';

        this.uiContainer.innerHTML = `
            <div class="cbp-brush-ui-header">
                <span class="cbp-brush-ui-title">Brush Settings</span>
                <button class="cbp-brush-ui-minimize-btn" title="Minimize" >−</button>
            </div>
            <div class="cbp-brush-ui-content">
                <label for="cbp-brush-size-input">Brush Size:
                    <input type="range" id="cbp-brush-size-input" min="${this.minBrushSize}" max="${this.maxBrushSize}" value="${this.brushSize}">
                </label>
                <label for="cbp-brush-opacity-input">Brush Opacity:
                    <input type="range" id="cbp-brush-opacity-input" min="0" max="100" value="${this.brushOpacity * 100}">
                </label>
                <div class="cbp-brush-ui-color-picker"> 
                    <button id="cbp-toggle-drawing-mode-btn" class="cbp-brush-ui-toggle-btn">
                        <img id="cbp-toggle-btn-icon" src=${this.brushIcon}  alt="Toggle Drawing Mode" width="24" height="24">
                    </button>
                    <input type="color" id="cbp-color-picker" value="${this.brushColor}">
                </div>
            </div>
        `;

        document.body.appendChild(this.uiContainer);
        this.brushSizeInput = this.uiContainer.querySelector('#cbp-brush-size-input');
        this.brushOpacityInput = this.uiContainer.querySelector('#cbp-brush-opacity-input');
        this.colorPicker = this.uiContainer.querySelector('#cbp-color-picker');
        this.toggleDrawBtn = this.uiContainer.querySelector('#cbp-toggle-drawing-mode-btn');
        this.toggleBtnIcon = this.uiContainer.querySelector('#cbp-toggle-btn-icon');
        this.minimizeBtn = this.uiContainer.querySelector('.cbp-brush-ui-minimize-btn');
        this.uiHeader = this.uiContainer.querySelector('.cbp-brush-ui-header');

        this.uiHeader.addEventListener('mousedown', this.onHeaderMouseDown);
        this.minimizeBtn.addEventListener('click', this.onMinimize);
        this.toggleDrawBtn.addEventListener('click', this.onToggleDrawingMode);
    }

    attachEventListeners() {
        this.brushSizeInput.addEventListener('input', this.onBrushSizeChange);
        this.brushOpacityInput.addEventListener('input', this.onBrushOpacityChange);
        this.colorPicker.addEventListener('input', this.onColorChange);
        document.addEventListener('keydown', (e) => {
            this.onKeyDown(e);
        });
        
        document.addEventListener('keyup', (e) => {
            this.onKeyUp(e);
        });
        

        if (this.canvasElement) {
            this.canvasElement.addEventListener('pointerenter', this.onCanvasPointerEnter);
            this.canvasElement.addEventListener('pointerleave', this.onCanvasPointerLeave);
            // console.log('Attached pointerenter and pointerleave to canvasElement.');
        }
        
    }

    detachEventListeners() {
        this.brushSizeInput.removeEventListener('input', this.onBrushSizeChange);
        this.brushOpacityInput.removeEventListener('input', this.onBrushOpacityChange);
        this.colorPicker.removeEventListener('input', this.onColorChange);
        window.removeEventListener('keydown', this.onKeyDown);

        this.uiHeader.removeEventListener('mousedown', this.onHeaderMouseDown);
        this.minimizeBtn.removeEventListener('click', this.onMinimize);
        this.toggleDrawBtn.removeEventListener('click', this.onToggleDrawingMode);
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
    }

    onCanvasPointerEnter(e) {
        if (this.isMouseOverCanvas) return; // Prevent redundant processing
        this.isMouseOverCanvas = true;

        if (this.canvasElement && typeof this.canvasElement.focus === 'function') {
            this.canvasElement.focus();
        }

        if (this.drawingMode && !this.showSystemCursor) {
            // this.updateCursorCircle();
            if (this.canvas.lowerCanvasEl) this.canvas.lowerCanvasEl.classList.add(this.hiddenCursorClass);
            if (this.canvas.upperCanvasEl) this.canvas.upperCanvasEl.classList.add(this.hiddenCursorClass);
        }
    }

    onCanvasPointerLeave(e) {
        if (!this.isMouseOverCanvas) return; // Prevent redundant processing
        this.isMouseOverCanvas = false;

        if (this.canvasElement && typeof this.canvasElement.blur === 'function') {
            this.canvasElement.blur();
        }

        if (this.drawingMode && !this.showSystemCursor) {
            if (this.canvas.lowerCanvasEl) this.canvas.lowerCanvasEl.classList.remove(this.hiddenCursorClass);
            if (this.canvas.upperCanvasEl) this.canvas.upperCanvasEl.classList.remove(this.hiddenCursorClass);
        }

        // Ensure cursor circles are hidden when mouse leaves
        if (this.drawingMode) {
            if (this.cursorCircle) {
                this.cursorCircle.visible = false;
            }
            if (this.secondaryCircle) {
                this.secondaryCircle.visible = false;
            }
            this.canvas.requestRenderAll();
        }
    }

    onKeyDown(e) {
        const key = e.key;
        if (['Alt', 'Control', 'Shift'].includes(key)) {
            if (this.drawingMode) {
                this.disableDrawingMode();
                this.brushToggledByKey = true; 
                // console.log(`Brush disabled via ${key} key press.`);
            }
        }

        switch (key) {
            case 'd':
                this.onToggleDrawingMode();
                break;                  
            default:
                break;
        }

        if (this.isMouseOverCanvas) {
            e.preventDefault();
        }
    }

    onKeyUp(e) {
        const key = e.key;
        if (['Alt', 'Control', 'Shift'].includes(key)) {
            if (this.brushToggledByKey) {
                this.enableDrawingMode();
                this.brushToggledByKey = false;
                // console.log(`Brush re-enabled via ${key} key release.`);
            }
        }

        if (this.isMouseOverCanvas) {
            e.preventDefault();
        }
    }
    

    disableSelectionBox() {
        this.canvas.selection = false;
        this.canvas.selectionColor = 'transparent';
        this.canvas.selectionBorderColor = 'transparent';
        this.canvas.selectionLineWidth = 0;

        this.canvas.hoverCursor = 'default';
        this.canvas.moveCursor = 'default';
        this.canvas.freeDrawingCursor = 'none';

        this.canvas.skipTargetFind = true;
        this.canvas.preserveObjectStacking = true;
    }

    configureCanvasObjects(isDrawingMode) {
        this.disableSelectionBox();
        this.setDrawnObjectsProperties(!isDrawingMode);
        this.enableDrawingControls(isDrawingMode);
        this.setNonDrawnObjectsSelectable(!isDrawingMode);
    }
    
    enableDrawingMode() {
        this.drawingMode = true;
        this.updateToggleButton(true);

        this.canvas.defaultCursor = this.showSystemCursor ? 'default' : 'none';
        if (!this.showSystemCursor) {
            if (this.lowerCanvasEl) this.lowerCanvasEl.classList.add(this.hiddenCursorClass);
            if (this.upperCanvasEl) this.upperCanvasEl.classList.add(this.hiddenCursorClass);
        }

        this.configureCanvasObjects(true);
        this.attachDrawingEvents();
        this.updateCursorCircle();
        this.canvas.requestRenderAll();
    }

    disableDrawingMode() {
        this.drawingMode = false;
        this.updateToggleButton(false);

        this.canvas.defaultCursor = this.originalCanvasProperties.defaultCursor || 'default';
        if (this.lowerCanvasEl) this.lowerCanvasEl.classList.remove(this.hiddenCursorClass);
        if (this.upperCanvasEl) this.upperCanvasEl.classList.remove(this.hiddenCursorClass);

        this.configureCanvasObjects(false);
        this.detachDrawingEvents();
        this.removeCursorCircles();
    }
    
    updateToggleButton(isActive) {
        const toggleButton = document.getElementById('cbp-toggle-drawing-mode-btn');
        if (isActive) {
            toggleButton.classList.add('active');
        } else {
            toggleButton.classList.remove('active');
        }
        this.toggleBtnIcon.src = this.brushIcon;
    }
    
    setDrawnObjectsProperties(selectable) {
        this.canvas.getObjects().forEach(obj => {
            if (this.drawnObjects.has(obj)) {
                obj.selectable = selectable;
                obj.evented = selectable;
                obj.hasControls = selectable;
                obj.hasBorders = selectable;
                obj.lockMovementX = !selectable;
                obj.lockMovementY = !selectable;
            }
        });
    }
    
    enableDrawingControls(enabled) {
        this.brushSizeInput.disabled = !enabled;
        this.brushOpacityInput.disabled = !enabled;
        this.colorPicker.disabled = !enabled;
    }
    
    removeCursorCircles() {
        if (this.cursorCircle) {
            this.canvas.remove(this.cursorCircle);
            this.cursorCircle = null;
        }
        if (this.secondaryCircle) {
            this.canvas.remove(this.secondaryCircle);
            this.secondaryCircle = null;
        }
    }
    
    onToggleDrawingMode() {
        if (!this.drawingMode) {
            this.enableDrawingMode();
            this.canvasManager.emit('brush:activated');
        } else {
            this.disableDrawingMode();
            this.canvasManager.emit('brush:deactivated');
        }
    }

    onBrushSizeChange(e) {
        this.brushSize = parseInt(e.target.value, 10);
        if (this.drawingMode) {
            this.updateCursorCircle();
            this.canvas.requestRenderAll();
        }
    }

    onBrushOpacityChange(e) {
        this.brushOpacity = parseInt(e.target.value, 10) / 100;
        if (this.drawingMode) {
            this.updateCursorCircle();
            this.canvas.requestRenderAll();
        }
    }

    onColorChange() {
        this.brushColor = this.colorPicker.value;
        if (this.drawingMode) {
            this.updateCursorCircle();
        }
    }

    storeOriginalCanvasProperties() {
        this.originalCanvasProperties = {
            selection: this.canvas.selection,
            selectionColor: this.canvas.selectionColor,
            selectionBorderColor: this.canvas.selectionBorderColor,
            selectionLineWidth: this.canvas.selectionLineWidth,
            hoverCursor: this.canvas.hoverCursor,
            moveCursor: this.canvas.moveCursor,
            defaultCursor: this.canvas.defaultCursor,
            freeDrawingCursor: this.canvas.freeDrawingCursor
        };
    }

    enforceObjectProperties(obj) {
        if (obj === this.cursorCircle || obj === this.secondaryCircle) return;

        if (this.isDrawnObject(obj)) {
            obj.selectable = false;
            obj.evented = false;
            obj.hasControls = false;
            obj.hasBorders = false;
            obj.lockMovementX = true;
            obj.lockMovementY = true;
            obj.hoverCursor = 'default';
            this.drawnObjects.add(obj);
        }
    }

    setNonDrawnObjectsSelectable(selectable) {
        this.canvas.getObjects().forEach((obj) => {
            if (!this.drawnObjects.has(obj) && obj !== this.cursorCircle && obj !== this.secondaryCircle) {
                obj.selectable = selectable;
                obj.evented = selectable;
                obj.hoverCursor = selectable ? 'move' : 'default';
            }
        });
    }

    attachDrawingEvents() {
        this.canvas.on('mouse:down', this.onMouseDown);
        this.canvas.on('mouse:move', this.onMouseMove);
        this.canvas.on('mouse:up', this.onMouseUp);
        this.canvas.on('mouse:wheel', this.handleMouseWheel);
        this.canvas.on('mouse:over', this.handleMouseOver);
        this.canvas.on('mouse:out', this.handleMouseOut);
    }

    detachDrawingEvents() {
        this.canvas.off('mouse:down', this.onMouseDown);
        this.canvas.off('mouse:move', this.onMouseMove);
        this.canvas.off('mouse:up', this.onMouseUp);
        this.canvas.off('mouse:wheel', this.handleMouseWheel);
        this.canvas.off('mouse:over', this.handleMouseOver);
        this.canvas.off('mouse:out', this.handleMouseOut);
    }

    // updateCursorCircle() {
    //     const dashArray = this.getStrokeDashArray();
    //     const isOutlined = this.cursorOutlineType === 'dashed' || this.cursorOutlineType === 'dotted';

    //     if (!this.cursorCircle) {
    //         this.cursorCircle = new fabric.Circle({
    //             radius: this.brushSize / 2,
    //             fill: this.cursorFill
    //                 ? (this.useBrushColorPrimaryColor
    //                     ? this.getFillColorWithOpacity(this.brushColor, this.brushOpacity)
    //                     : this.getFillColorWithOpacity(this.cursorPrimaryColor, this.cursorRingOpacityAffected ? this.brushOpacity : 1))
    //                 : 'transparent',
    //             stroke: this.getCursorStrokeColor(),
    //             strokeWidth: this.cursorOutlineType === 'none' ? 0 : this.cursorLineWidth,
    //             selectable: false,
    //             evented: false,
    //             hasControls: false,
    //             hasBorders: false,
    //             originX: 'center',
    //             originY: 'center',
    //             strokeDashArray: dashArray,
    //             hoverCursor: 'none'
    //         });

    //         if (isOutlined && !this.useBrushColorForCursorRing) {
    //             this.secondaryCircle = new fabric.Circle({
    //                 radius: this.brushSize / 2,
    //                 fill: 'transparent',
    //                 stroke: this.cursorSecondaryColor,
    //                 strokeWidth: this.cursorLineWidth,
    //                 selectable: false,
    //                 evented: false,
    //                 hasControls: false,
    //                 hasBorders: false,
    //                 originX: 'center',
    //                 originY: 'center',
    //                 strokeDashArray: dashArray,
    //                 strokeDashOffset: this.cursorOutlineType === 'dashed' ? dashArray[0] : dashArray[0],
    //                 hoverCursor: 'none'
    //             });
    //             this.canvas.add(this.secondaryCircle);
    //         }

    //         this.canvas.add(this.cursorCircle);
    //         if (this.secondaryCircle) {
    //             this.secondaryCircle.bringToFront();
    //         }
    //         this.cursorCircle.bringToFront();
    //     } else {
    //         this.cursorCircle.set({
    //             radius: this.brushSize / 2,
    //             fill: this.cursorFill
    //                 ? (this.useBrushColorPrimaryColor
    //                     ? this.getFillColorWithOpacity(this.brushColor, this.brushOpacity)
    //                     : this.getFillColorWithOpacity(this.cursorPrimaryColor, this.cursorRingOpacityAffected ? this.brushOpacity : 1))
    //                 : 'transparent',
    //             stroke: this.getCursorStrokeColor(),
    //             strokeWidth: this.cursorOutlineType === 'none' ? 0 : this.cursorLineWidth,
    //             strokeDashArray: dashArray
    //         });

    //         if (isOutlined && !this.useBrushColorForCursorRing) {
    //             if (!this.secondaryCircle) {
    //                 this.secondaryCircle = new fabric.Circle({
    //                     radius: this.brushSize / 2,
    //                     fill: 'transparent',
    //                     stroke: this.cursorSecondaryColor,
    //                     strokeWidth: this.cursorLineWidth,
    //                     selectable: false,
    //                     evented: false,
    //                     hasControls: false,
    //                     hasBorders: false,
    //                     originX: 'center',
    //                     originY: 'center',
    //                     strokeDashArray: dashArray,
    //                     strokeDashOffset: this.cursorOutlineType === 'dashed' ? dashArray[0] : dashArray[0],
    //                     hoverCursor: 'none'
    //                 });
    //                 this.canvas.add(this.secondaryCircle);
    //             } else {
    //                 this.secondaryCircle.set({
    //                     radius: this.brushSize / 2,
    //                     stroke: this.cursorSecondaryColor,
    //                     strokeWidth: this.cursorLineWidth,
    //                     strokeDashArray: dashArray,
    //                     strokeDashOffset: this.cursorOutlineType === 'dashed' ? dashArray[0] : dashArray[0]
    //                 });
    //             }
    //         } else if (this.secondaryCircle) {
    //             this.canvas.remove(this.secondaryCircle);
    //             this.secondaryCircle = null;
    //         }
    //     }

    //     if (this.currentZoom !== 0) {
    //         const scale = 1 / this.currentZoom;
    //         this.cursorCircle.set({
    //             scaleX: scale,
    //             scaleY: scale
    //         });
    //         if (this.secondaryCircle) {
    //             this.secondaryCircle.set({
    //                 scaleX: scale,
    //                 scaleY: scale
    //             });
    //         }
    //     }
    // }

    updateCursorCircle() {
        const dashArray = this.getStrokeDashArray();
        const isOutlined = this.cursorOutlineType === 'dashed' || this.cursorOutlineType === 'dotted';
    
        // Define positions off the canvas
        const offCanvasPosition = -100000; // Position to the top-left outside the canvas
    
        if (!this.cursorCircle) {
            this.cursorCircle = new fabric.Circle({
                radius: this.brushSize / 2,
                fill: this.cursorFill
                    ? (this.useBrushColorPrimaryColor
                        ? this.getFillColorWithOpacity(this.brushColor, this.brushOpacity)
                        : this.getFillColorWithOpacity(this.cursorPrimaryColor, this.cursorRingOpacityAffected ? this.brushOpacity : 1))
                    : 'transparent',
                stroke: this.getCursorStrokeColor(),
                strokeWidth: this.cursorOutlineType === 'none' ? 0 : this.cursorLineWidth,
                selectable: false,
                evented: false,
                hasControls: false,
                hasBorders: false,
                originX: 'center',
                originY: 'center',
                left: offCanvasPosition, // Set initial horizontal position off-canvas
                top: offCanvasPosition,  // Set initial vertical position off-canvas
                strokeDashArray: dashArray,
                hoverCursor: 'none'
            });
    
            if (isOutlined && !this.useBrushColorForCursorRing) {
                this.secondaryCircle = new fabric.Circle({
                    radius: this.brushSize / 2,
                    fill: 'transparent',
                    stroke: this.cursorSecondaryColor,
                    strokeWidth: this.cursorLineWidth,
                    selectable: false,
                    evented: false,
                    hasControls: false,
                    hasBorders: false,
                    originX: 'center',
                    originY: 'center',
                    left: offCanvasPosition, // Set initial horizontal position off-canvas
                    top: offCanvasPosition,  // Set initial vertical position off-canvas
                    strokeDashArray: dashArray,
                    strokeDashOffset: this.cursorOutlineType === 'dashed' ? dashArray[0] : dashArray[0],
                    hoverCursor: 'none'
                });
                this.canvas.add(this.secondaryCircle);
            }
    
            this.canvas.add(this.cursorCircle);
            if (this.secondaryCircle) {
                this.secondaryCircle.bringToFront();
            }
            this.cursorCircle.bringToFront();
        } else {
            this.cursorCircle.set({
                radius: this.brushSize / 2,
                fill: this.cursorFill
                    ? (this.useBrushColorPrimaryColor
                        ? this.getFillColorWithOpacity(this.brushColor, this.brushOpacity)
                        : this.getFillColorWithOpacity(this.cursorPrimaryColor, this.cursorRingOpacityAffected ? this.brushOpacity : 1))
                    : 'transparent',
                stroke: this.getCursorStrokeColor(),
                strokeWidth: this.cursorOutlineType === 'none' ? 0 : this.cursorLineWidth,
                strokeDashArray: dashArray
            });
    
            if (isOutlined && !this.useBrushColorForCursorRing) {
                if (!this.secondaryCircle) {
                    this.secondaryCircle = new fabric.Circle({
                        radius: this.brushSize / 2,
                        fill: 'transparent',
                        stroke: this.cursorSecondaryColor,
                        strokeWidth: this.cursorLineWidth,
                        selectable: false,
                        evented: false,
                        hasControls: false,
                        hasBorders: false,
                        originX: 'center',
                        originY: 'center',
                        left: offCanvasPosition, // Set initial horizontal position off-canvas
                        top: offCanvasPosition,  // Set initial vertical position off-canvas
                        strokeDashArray: dashArray,
                        strokeDashOffset: this.cursorOutlineType === 'dashed' ? dashArray[0] : dashArray[0],
                        hoverCursor: 'none'
                    });
                    this.canvas.add(this.secondaryCircle);
                } else {
                    this.secondaryCircle.set({
                        radius: this.brushSize / 2,
                        stroke: this.cursorSecondaryColor,
                        strokeWidth: this.cursorLineWidth,
                        strokeDashArray: dashArray,
                        strokeDashOffset: this.cursorOutlineType === 'dashed' ? dashArray[0] : dashArray[0]
                    });
                }
            } else if (this.secondaryCircle) {
                this.canvas.remove(this.secondaryCircle);
                this.secondaryCircle = null;
            }
        }
    
        if (this.currentZoom !== 0) {
            const scale = 1 / this.currentZoom;
            this.cursorCircle.set({
                scaleX: scale,
                scaleY: scale
            });
            if (this.secondaryCircle) {
                this.secondaryCircle.set({
                    scaleX: scale,
                    scaleY: scale
                });
            }
        }
    
        // Ensure the canvas is re-rendered to reflect changes
        this.canvas.requestRenderAll();
    }
    
    getCursorStrokeColor() {
        if (this.cursorOutlineType === 'none') {
            return 'transparent';
        }

        if (this.cursorOutlineType === 'solid') {
            return this.useBrushColorForCursorRing ? this.brushColor : this.cursorPrimaryColor;
        }

        if (this.cursorOutlineType === 'dashed' || this.cursorOutlineType === 'dotted') {
            return this.useBrushColorForCursorRing ? this.brushColor : this.cursorPrimaryColor;
        }

        return this.cursorPrimaryColor;
    }

    getStrokeDashArray() {
        if (this.cursorOutlineType === 'solid') {
            return [];
        } else if (this.cursorOutlineType === 'dashed') {
            return [4, 4];
        } else if (this.cursorOutlineType === 'dotted') {
            return [1, 2];
        } else if (this.cursorOutlineType === 'none') {
            return [];
        }
        return [];
    }

    handleMouseWheel(opt) {
        if (!this.drawingMode) return;

        const delta = opt.e.deltaY;
        opt.e.preventDefault();
        opt.e.stopPropagation();

        let deltaSize = delta < 0 ? 1 : -1;
        deltaSize *= this.brushTipResizeSpeed;
        this.brushSize = Math.min(this.maxBrushSize, Math.max(this.minBrushSize, this.brushSize + deltaSize));
        this.brushSizeInput.value = this.brushSize;
        this.updateCursorCircle();
        this.canvas.requestRenderAll();
    }

    handleMouseOver() {
        if (this.drawingMode) {
            if (this.cursorCircle) {
                this.cursorCircle.visible = true;
            }
            if (this.secondaryCircle) {
                this.secondaryCircle.visible = true;
            }
            this.canvas.requestRenderAll();
        }
    }

    handleMouseOut() {
        if (this.drawingMode) {
            if (this.cursorCircle) {
                this.cursorCircle.visible = false;
            }
            if (this.secondaryCircle) {
                this.secondaryCircle.visible = false;
            }
            this.canvas.requestRenderAll();
        }
    }

    updateCursorPosition(opt) {
        if (!this.cursorCircle) return;

        const pointer = this.canvas.getPointer(opt.e);

        const scale = 1 / this.currentZoom;

        this.cursorCircle.set({
            left: pointer.x,
            top: pointer.y,
            scaleX: scale,
            scaleY: scale
        }).setCoords();

        if (this.secondaryCircle) {
            this.secondaryCircle.set({
                left: pointer.x,
                top: pointer.y,
                scaleX: scale,
                scaleY: scale
            }).setCoords();

            this.secondaryCircle.bringToFront();
        }

        this.cursorCircle.bringToFront();
    }

    onMouseMove(o) {
        const pointer = this.canvas.getPointer(o.e);

        this.updateCursorPosition(o);

        if (this.isMouseDown && this.currentPath) {
            const pathData = this.currentPath.path;
            pathData.push(['L', pointer.x, pointer.y]);
            this.currentPath.set({ path: pathData });

            this.canvas.requestRenderAll();
        }
    }

    onMouseDown(o) {
        this.isMouseDown = true;
        const pointer = this.canvas.getPointer(o.e);
        this.lastPointer = pointer;

        this.currentPath = new fabric.Path(`M ${pointer.x} ${pointer.y}`, {
            stroke: this.brushColor,
            strokeWidth: this.brushSize / this.currentZoom,
            fill: null,
            selectable: false,
            evented: false,
            opacity: this.brushOpacity,
            originX: 'center',
            originY: 'center',
            objectCaching: false,
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            brushStrokeId: `brush-stroke-${this.brushStrokeIdCounter++}`
        });

        this.canvas.add(this.currentPath);
        this.drawnObjects.add(this.currentPath);
    }

    onMouseUp() {
        if (this.isMouseDown && this.currentPath) {
            this.isMouseDown = false;
            this.currentPath.setCoords();
            this.currentPath = null;
            // No need to manually fire 'object:added'; Fabric.js handles it
        }
    }

    onViewportChanged(event) {
        const { transform } = event;
        const zoom = transform[0];

        this.currentZoom = zoom;

        if (this.cursorCircle) {
            const scale = 1 / zoom;
            this.cursorCircle.set({
                scaleX: scale,
                scaleY: scale
            });

            if (this.secondaryCircle) {
                this.secondaryCircle.set({
                    scaleX: scale,
                    scaleY: scale
                });
            }
        }
    }

    onHeaderMouseDown(e) {
        e.preventDefault();
        this.isDragging = true;

        const rect = this.uiContainer.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;

        document.addEventListener('mousemove', this.onDocumentMouseMove);
        document.addEventListener('mouseup', this.onDocumentMouseUp);
    }

    onDocumentMouseMove(e) {
        if (!this.isDragging) return;

        let newLeft = e.clientX - this.dragOffsetX;
        let newTop = e.clientY - this.dragOffsetY;

        // Constrain within the viewport
        const containerWidth = this.uiContainer.offsetWidth;
        const containerHeight = this.uiContainer.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        newLeft = Math.max(0, Math.min(newLeft, windowWidth - containerWidth));
        newTop = Math.max(0, Math.min(newTop, windowHeight - containerHeight));

        // Update UI container position
        this.uiContainer.style.left = `${newLeft}px`;
        this.uiContainer.style.top = `${newTop}px`;
        this.uiContainer.style.bottom = 'auto';
        this.uiContainer.style.right = 'auto';
    }

    onDocumentMouseUp(e) {
        this.isDragging = false;

        document.removeEventListener('mousemove', this.onDocumentMouseMove);
        document.removeEventListener('mouseup', this.onDocumentMouseUp);
    }

    onMinimize() {
        if (this.currentMode === 'minimized') {
            this.currentMode = this.previousMode || 'full';
        } else {
            this.previousMode = this.currentMode;
            this.currentMode = 'minimized';
        }
        this.onModeChange();
    }

    onModeChange() {
        if (this.currentMode === 'full') {
            this.uiContainer.classList.remove('cbp-brush-ui-mini', 'cbp-brush-ui-minimized');
            this.uiContainer.classList.add('cbp-brush-ui-full');
            this.minimizeBtn.title = 'Minimize';
            this.minimizeBtn.textContent = '−';
            this.toggleDrawBtn.style.display = 'block';
            this.uiContainer.querySelector('.cbp-brush-ui-title').textContent = 'Brush Settings';
            this.updateUIForMode();
        } else if (this.currentMode === 'mini') {
            this.uiContainer.classList.remove('cbp-brush-ui-full', 'cbp-brush-ui-minimized');
            this.uiContainer.classList.add('cbp-brush-ui-mini');
            this.minimizeBtn.title = 'Minimize';
            this.minimizeBtn.textContent = '−';
            this.toggleDrawBtn.style.display = 'block';
            // this.uiContainer.querySelector('.cbp-brush-ui-title').textContent = 'Brush';
            this.updateUIForMode();
        } else if (this.currentMode === 'minimized') {
            this.uiContainer.classList.remove('cbp-brush-ui-full', 'cbp-brush-ui-mini');
            this.uiContainer.classList.add('cbp-brush-ui-minimized');
            this.minimizeBtn.title = 'Maximize';
            this.minimizeBtn.textContent = '+';
            this.toggleDrawBtn.style.display = 'none';
            this.uiContainer.querySelector('.cbp-brush-ui-title').textContent = '';
        }
    }

    updateUIForMode() {
        const content = this.uiContainer.querySelector('.cbp-brush-ui-content');

        if (this.currentMode === 'full') {
            content.innerHTML = `
                <label for="cbp-brush-size-input">Brush Size:
                    <input type="range" id="cbp-brush-size-input" min="${this.minBrushSize}" max="${this.maxBrushSize}" value="${this.brushSize}">
                </label>
                <label for="cbp-brush-opacity-input">Brush Opacity:
                    <input type="range" id="cbp-brush-opacity-input" min="0" max="100" value="${this.brushOpacity * 100}">
                </label>
                <label for="cbp-color-picker">Brush Color:
                    <input type="color" id="cbp-color-picker" value="${this.brushColor}">
                </label>
                <button id="cbp-toggle-drawing-mode-btn" class="${this.drawingMode ? 'cbp-brush-ui-toggle-btn active' : 'cbp-brush-ui-toggle-btn'}">
                    <img id="cbp-toggle-btn-icon" src="${this.brushIcon}"  alt="Toggle Drawing Mode" width="24" height="24">
                </button>
            `;
        } else if (this.currentMode === 'mini') {
            content.innerHTML = `
                <div class="cbp-brush-ui-input-group">
                    <input type="number" id="cbp-brush-size-input" min="${this.minBrushSize}" max="${this.maxBrushSize}" value="${this.brushSize}" title="Brush Size">
                </div>
                <div class="cbp-brush-ui-input-group">
                    <input type="number" id="cbp-brush-opacity-input" min="0" max="100" value="${this.brushOpacity * 100}" title="Brush Opacity">
                </div>
                <div class="cbp-brush-ui-input-group">
                    <input type="color" id="cbp-color-picker" value="${this.brushColor}" title="Brush Color">
                </div>
                <button id="cbp-toggle-drawing-mode-btn" class="${this.drawingMode ? 'cbp-brush-ui-toggle-btn active' : 'cbp-brush-ui-toggle-btn'}">
                    <img id="cbp-toggle-btn-icon" src="${this.brushIcon}"  alt="Toggle Drawing Mode" width="24" height="24">
                </button>
            `;
        }
        this.brushSizeInput = this.uiContainer.querySelector('#cbp-brush-size-input');
        this.brushOpacityInput = this.uiContainer.querySelector('#cbp-brush-opacity-input');
        this.colorPicker = this.uiContainer.querySelector('#cbp-color-picker');
        this.toggleDrawBtn = this.uiContainer.querySelector('#cbp-toggle-drawing-mode-btn');
        this.toggleBtnIcon = this.uiContainer.querySelector('#cbp-toggle-btn-icon');

        this.brushSizeInput.addEventListener('input', this.onBrushSizeChange);
        this.brushOpacityInput.addEventListener('input', this.onBrushOpacityChange);
        this.colorPicker.addEventListener('input', this.onColorChange);
        this.toggleDrawBtn.addEventListener('click', this.onToggleDrawingMode);
    }

    switchToMiniMode() {
        if (this.currentMode !== 'minimized') {
            this.previousMode = this.currentMode;
            this.currentMode = 'mini';
            this.onModeChange();
        }
    }

    switchToFullMode() {
        if (this.currentMode !== 'minimized') {
            this.currentMode = 'full';
            this.onModeChange();
        }
    }

    destroy() {
        if (this.uiContainer) {
            document.body.removeChild(this.uiContainer);
            this.uiContainer = null;
        }

        this.detachEventListeners();

        this.detachDrawingEvents();

        if (this.cursorCircle) {
            this.canvas.remove(this.cursorCircle);
            this.cursorCircle = null;
        }
        if (this.secondaryCircle) {
            this.canvas.remove(this.secondaryCircle);
            this.secondaryCircle = null;
        }

        this.canvas.off('object:added', this.onObjectAdded);

        this.canvasManager.off('viewport:changed', this.onViewportChanged);

        if (this.originalCanvasProperties) {
            this.canvas.selection = this.originalCanvasProperties.selection;
            this.canvas.selectionColor = this.originalCanvasProperties.selectionColor;
            this.canvas.selectionBorderColor = this.originalCanvasProperties.selectionBorderColor;
            this.canvas.selectionLineWidth = this.originalCanvasProperties.selectionLineWidth;
            this.canvas.hoverCursor = this.originalCanvasProperties.hoverCursor;
            this.canvas.moveCursor = this.originalCanvasProperties.moveCursor;
            this.canvas.defaultCursor = this.originalCanvasProperties.defaultCursor;
            this.canvas.freeDrawingCursor = this.originalCanvasProperties.freeDrawingCursor;
        }
        super.destroy();
    }
}
