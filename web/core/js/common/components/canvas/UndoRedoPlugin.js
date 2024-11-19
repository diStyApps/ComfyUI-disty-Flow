import { CanvasPlugin } from './CanvasPlugin.js';

export class UndoRedoPlugin extends CanvasPlugin {
    constructor(options = {}) {
        super(options.name || 'UndoRedoPlugin');

        this.maxHistory = options.maxHistory || 50;

        this.undoStack = [];
        this.redoStack = [];

        this.canvasManager = null;
        this.canvas = null;

        this.undoBtn = null;
        this.redoBtn = null;

        this.isPerformingUndoRedo = false;

        this.handleObjectAdded = this.handleObjectAdded.bind(this);
        this.handleObjectRemoved = this.handleObjectRemoved.bind(this);
        this.handleMaskStrokeAdded = this.handleMaskStrokeAdded.bind(this);
        this.handleMaskStrokeRemoved = this.handleMaskStrokeRemoved.bind(this);
        this.onUndo = this.onUndo.bind(this);
        this.onRedo = this.onRedo.bind(this);
        this.updateButtons = this.updateButtons.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onFocus = this.onFocus.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.onMouseEnter = this.onMouseEnter.bind(this);
    }

    init(canvasManager) {
        this.canvasManager = canvasManager;
        this.canvas = canvasManager.canvas;

        this.makeFocusable();

        this.createUI();

        this.canvas.on('object:added', this.handleObjectAdded);
        this.canvas.on('object:removed', this.handleObjectRemoved);
        this.canvasManager.on('mask:stroke:added', this.handleMaskStrokeAdded);
        this.canvasManager.on('mask:stroke:removed', this.handleMaskStrokeRemoved);
        
        this.focusableElement.addEventListener('keydown', this.onKeyDown);
        this.focusableElement.addEventListener('focus', this.onFocus);
        this.focusableElement.addEventListener('blur', this.onBlur);

        this.focusableElement.addEventListener('mouseenter', this.onMouseEnter);

        this.updateButtons();
    }

    makeFocusable() {
        const container = this.canvas.lowerCanvasEl.parentElement;
        if (!container) {
            console.error('UndoRedoPlugin: Canvas container not found.');
            return;
        }

        container.setAttribute('tabindex', '0');
        container.style.outline = 'none';

        this.focusableElement = container;
    }

    handleObjectAdded(e) {
        if (this.isPerformingUndoRedo) return; 

        const obj = e.target;
        if (this.isBrushStroke(obj)) {
            // console.log('UndoRedoPlugin: Brush stroke added', obj);

            if (!obj.brushStrokeId) {
                obj.brushStrokeId = `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                obj.set('brushStrokeId', obj.brushStrokeId);
            }
            this.undoStack.push(obj.toObject(['type', 'path', 'stroke', 'strokeWidth', 'opacity', 'brushStrokeId']));
            if (this.undoStack.length > this.maxHistory) {
                this.undoStack.shift();
            }
            this.redoStack = [];
            this.updateButtons();
        }
    }

    handleObjectRemoved(e) {
        if (this.isPerformingUndoRedo) return; 

        const obj = e.target;
        if (this.isBrushStroke(obj)) {
            // console.log('UndoRedoPlugin: Brush stroke removed', obj);
            this.redoStack.push(obj.toObject(['type', 'path', 'stroke', 'strokeWidth', 'opacity', 'brushStrokeId']));
            if (this.redoStack.length > this.maxHistory) {
                this.redoStack.shift();
            }
            this.updateButtons();
        }
    }

    isBrushStroke(obj) {
        const isPath = obj && obj.type === 'path';
        // console.log(`UndoRedoPlugin: isBrushStroke check for object type '${obj.type}': ${isPath}`);
        return isPath;
    }

    handleMaskStrokeAdded(strokeData) {
        // console.log('UndoRedoPlugin: Mask stroke added', strokeData);
        this.undoStack.push({
            type: 'mask_add',
            maskName: strokeData.maskName,
            strokeData: strokeData
        });
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this.updateButtons();
    }

    handleMaskStrokeRemoved(strokeData) {
        // console.log('UndoRedoPlugin: Mask stroke removed', strokeData);
        this.redoStack.push({
            type: 'mask_remove',
            maskName: strokeData.maskName,
            strokeData: strokeData
        });
        if (this.redoStack.length > this.maxHistory) {
            this.redoStack.shift();
        }
        this.updateButtons();
    }

    createUI() {
        if (!document.querySelector('style[data-plugin="undo-redo"]')) {
            const styleSheet = document.createElement('style');
            styleSheet.setAttribute('data-plugin', 'undo-redo');
            styleSheet.textContent = `
                .ur-container * {
                    box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }
                
                .ur-container {
                    display: inline-flex;
                    gap: 0.5rem;
                    padding: 0.5rem;
                    /*  background: var(--color-background); */
                   /*  border: 1px dashed var(--color-border); */
                }

                .ur-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5rem;
                    background: var(--color-button-primary);
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: var(--color-primary-text);
                    height: 36px;
                    min-width: 36px;
                }

                .ur-button:hover {
                    background: var(--color-button-primary-hover);
                }

                .ur-button svg {
                    width: 1.25rem;
                    height: 1.25rem;
                }

                .ur-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .ur-button:disabled:hover {
                    background: var(--color-button-primary);
                }
            `;
            document.head.appendChild(styleSheet);
        }

        const container = document.createElement('div');
        container.className = 'ur-container';

        this.undoBtn = document.createElement('button');
        this.undoBtn.className = 'ur-button';
        this.undoBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
            </svg>
        `;
        this.undoBtn.title = 'Undo (Ctrl+Z)';
        this.undoBtn.disabled = true;
        this.undoBtn.addEventListener('click', this.onUndo);

        this.redoBtn = document.createElement('button');
        this.redoBtn.className = 'ur-button';
        this.redoBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"/>
            </svg>
        `;
        this.redoBtn.title = 'Redo (Ctrl+Y)';
        this.redoBtn.disabled = true;
        this.redoBtn.addEventListener('click', this.onRedo);

        container.appendChild(this.undoBtn);
        container.appendChild(this.redoBtn);

        const pluginUIContainer = document.getElementById('pluginUIContainer');
        if (pluginUIContainer) {
            pluginUIContainer.appendChild(container);
        } else {
            console.error('UndoRedoPlugin: #pluginUIContainer not found in the DOM.');
        }
    }

    onUndo() {
        // console.log('UndoRedoPlugin: Undo.');

        if (this.undoStack.length === 0) {
            console.log('UndoRedoPlugin: Undo stack is empty.');
            return;
        }

        const lastAction = this.undoStack.pop();
        // console.log('UndoRedoPlugin: Performing Undo', lastAction);

        this.isPerformingUndoRedo = true;

        if (lastAction.type === 'mask_add') {
            this.canvasManager.emit('undo:mask:stroke', lastAction.strokeData);
            this.redoStack.push(lastAction);
        } else if (lastAction.type === 'mask_remove') {
            this.canvasManager.emit('redo:mask:stroke', lastAction.strokeData);
            this.redoStack.push(lastAction);
        } else {
            const brushStrokeId = lastAction.brushStrokeId;
            const targetObj = this.canvas.getObjects('path').find(obj => obj.brushStrokeId === brushStrokeId);
            if (targetObj) {
                this.canvas.remove(targetObj);
                this.redoStack.push(lastAction);
                // console.log('UndoRedoPlugin: Brush stroke removed for Undo');
            } else {
                console.warn('UndoRedoPlugin: Could not find the brush stroke object to undo.');
            }
        }

        this.isPerformingUndoRedo = false;

        this.updateButtons();
    }

    onRedo() {
        // console.log('UndoRedoPlugin: Redo.');

        if (this.redoStack.length === 0) {
            // console.log('UndoRedoPlugin: Redo stack is empty.');
            return;
        }

        const lastUndone = this.redoStack.pop();
        // console.log('UndoRedoPlugin: Performing Redo', lastUndone);

        this.isPerformingUndoRedo = true;

        if (lastUndone.type === 'mask_add') {
            this.canvasManager.emit('redo:mask:stroke', lastUndone.strokeData);
            this.undoStack.push(lastUndone);
        } else if (lastUndone.type === 'mask_remove') {
            this.canvasManager.emit('undo:mask:stroke', lastUndone.strokeData);
            this.undoStack.push(lastUndone);
        } else {
            const path = new fabric.Path(lastUndone.path, {
                stroke: lastUndone.stroke,
                strokeWidth: lastUndone.strokeWidth,
                fill: null,
                selectable: false,
                evented: false,
                hasControls: false,
                hasBorders: false,
                lockMovementX: true,
                lockMovementY: true,
                opacity: lastUndone.opacity,
                brushStrokeId: lastUndone.brushStrokeId
            });
            this.canvas.add(path);
            this.undoStack.push(lastUndone);
            // console.log('UndoRedoPlugin: Brush stroke re-added for Redo');
        }

        this.isPerformingUndoRedo = false;

        this.updateButtons();
    }

    updateButtons() {
        this.undoBtn.disabled = this.undoStack.length === 0;
        this.redoBtn.disabled = this.redoStack.length === 0;
        // console.log(`UndoRedoPlugin: Update Buttons - Undo: ${!this.undoBtn.disabled}, Redo: ${!this.redoBtn.disabled}`);
    }

    onKeyDown(e) {
        if (this.isFocused) {
            if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                this.onUndo();
            }
            if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
                e.preventDefault();
                this.onRedo();
            }
        }
    }

    onFocus() {
        this.isFocused = true;
        // console.log('UndoRedoPlugin: Canvas focused.');
    }

    onBlur() {
        this.isFocused = false;
        // console.log('UndoRedoPlugin: Canvas lost focus.');
    }

    onMouseEnter() {
        this.focusableElement.focus();
        // console.log('UndoRedoPlugin: Canvas focused via mouse enter.');
    }

    destroy() {
        this.canvas.off('object:added', this.handleObjectAdded);
        this.canvas.off('object:removed', this.handleObjectRemoved);
        this.canvasManager.off('mask:stroke:added', this.handleMaskStrokeAdded);
        this.canvasManager.off('mask:stroke:removed', this.handleMaskStrokeRemoved);
        if (this.focusableElement) {
            this.focusableElement.removeEventListener('keydown', this.onKeyDown);
            this.focusableElement.removeEventListener('focus', this.onFocus);
            this.focusableElement.removeEventListener('blur', this.onBlur);
            this.focusableElement.removeEventListener('mouseenter', this.onMouseEnter);
        }

        const container = document.querySelector('.ur-container');
        if (container && this.undoBtn && this.redoBtn) {
            container.removeChild(this.undoBtn);
            container.removeChild(this.redoBtn);
        }

        this.undoStack = [];
        this.redoStack = [];

        super.destroy();
    }
}
