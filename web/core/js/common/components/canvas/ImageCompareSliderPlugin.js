import { CanvasPlugin } from './CanvasPlugin.js';

export class ImageCompareSliderPlugin extends CanvasPlugin {
    constructor(options = {}) {
        super('ImageCompareSliderPlugin');

        this.options = {
            sliderColor: '#570d7b',
            sliderWidth: 2,
            handleRadius: 18,
            handleStrokeWidth: 4,
            handleStrokeColor: '#fff',
            topMargin: 23,
            bottomMargin: 23,
            mode: 'Pairs', // 'Pairs', 'Replace', 'Multi'
            ...options
        };

        this.init = this.init.bind(this);
        this.destroy = this.destroy.bind(this);
        this.onImageLoaded = this.onImageLoaded.bind(this);
        this.onImageRemoved = this.onImageRemoved.bind(this);
        this.onImageListUpdated = this.onImageListUpdated.bind(this);
        this.onViewportChanged = this.onViewportChanged.bind(this);
        this.updateSliderElements = this.updateSliderElements.bind(this);
        this.updateClipPath = this.updateClipPath.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseDoubleClick = this.onMouseDoubleClick.bind(this);
        this.animateSlider = this.animateSlider.bind(this);
        this.ensureSliderOnTop = this.ensureSliderOnTop.bind(this);
        this.onAfterRender = this.onAfterRender.bind(this);
        this.setupSliderWithImages = this.setupSliderWithImages.bind(this);
        this.initializeMultiModeSelector = this.initializeMultiModeSelector.bind(this);
        this.onMultiModeSelection = this.onMultiModeSelection.bind(this);

        this.canvasManager = null;
        this.canvas = null;
        this.images = []; 
        this.sliderLine = null;
        this.sliderHandle = null;
        this.animating = false;
        this.pingPong = true;
        this.moveRight = true;
        this.isInitialized = false;
        this.isDragging = false;

        this.multiModeUI = null;
        this.imageListContainer = null;
        this.compareButton = null;
    }

    init(canvasManager) {
        this.canvasManager = canvasManager;
        this.canvas = canvasManager.canvas;

        this.canvasManager.on('image:loaded', this.onImageLoaded);
        this.canvasManager.on('image:removed', this.onImageRemoved);
        this.canvasManager.on('image:list:updated', this.onImageListUpdated);
        this.canvasManager.on('viewport:changed', this.onViewportChanged);

        this.canvas.on('mouse:down', this.onMouseDown);
        this.canvas.on('mouse:move', this.onMouseMove);
        this.canvas.on('mouse:up', this.onMouseUp);
        this.canvas.on('mouse:out', this.onMouseUp);
        this.canvas.on('mouse:dblclick', this.onMouseDoubleClick);

        this.canvas.on('after:render', this.onAfterRender);

        if (this.options.mode === 'Multi') {
            this.initializeMultiModeSelector();
        }

        console.log('ImageCompareSliderPlugin initialized');
    }

    onAfterRender() {
        this.ensureSliderOnTop();
    }

    ensureSliderOnTop() {
        if (!this.isReady()) return;

        const objects = this.canvas.getObjects();

        const maxIndex = objects.length - 1;

        const lineIndex = objects.indexOf(this.sliderLine);
        const handleIndex = objects.indexOf(this.sliderHandle);

        if (lineIndex !== maxIndex - 1) {
            this.sliderLine.moveTo(maxIndex - 1);
            console.log('sliderLine moved to top -1');
        }
        if (handleIndex !== maxIndex) {
            this.sliderHandle.moveTo(maxIndex);
            console.log('sliderHandle moved to top');
        }
    }

    isReady() {
        return this.isInitialized &&
            this.sliderLine &&
            this.sliderHandle &&
            this.images.length === 2;
    }

    onImageListUpdated({ images }) {
        console.log('Image list updated:', images);
        this.images = images;
        this.updateComparisonImages();
    }

    onImageLoaded({ image, id }) {
        console.log(`Image loaded: ID=${id}`);
        if (this.options.mode === 'Pairs') {
            if (this.images.length > 1) {
                const imagesToRemove = this.images.slice(0, this.images.length - 1);
                imagesToRemove.forEach(img => {
                    console.log(`Removing image ID=${img.id} to maintain 'Pairs' mode`);
                    this.canvasManager.emit('image:remove', { id: img.id });
                });
            }
        } else if (this.options.mode === 'Replace') {
            if (this.images.length > 2) {
                const imagesToRemove = this.images.slice(0, this.images.length - 2);
                imagesToRemove.forEach(img => {
                    console.log(`Removing image ID=${img.id} to maintain 'Replace' mode`);
                    this.canvasManager.emit('image:remove', { id: img.id });
                });
            }
        }
    }

    onImageRemoved({ id }) {
        console.log(`Image removed: ID=${id}`);
        this.images = this.images.filter(img => img.id !== id);
        if (this.images.length < 2) {
            this.destroySlider();
        } else {
            this.updateComparisonImages();
        }
    }

    updateComparisonImages() {
        console.log('Updating comparison images based on current mode:', this.options.mode);
        if (this.images.length < 2) {
            this.destroySlider();
            return;
        }

        if (this.options.mode === 'Multi') {
            this.updateMultiModeUI();

        } else {
            let img1, img2;

            if (this.options.mode === 'Pairs') {

                img1 = this.images[this.images.length - 2];
                img2 = this.images[this.images.length - 1];
            } else if (this.options.mode === 'Replace') {
                img1 = this.images[this.images.length - 2];
                img2 = this.images[this.images.length - 1];
            }
            if (img1 && img2) {
                this.setupSliderWithImages(img1.id, img2.id);
            }
        }
    }

    setupSliderWithImages(id1, id2) {
        console.log(`Setting up slider with images ID1=${id1}, ID2=${id2}`);
        const imageData1 = this.canvasManager.getImageById(id1);
        const imageData2 = this.canvasManager.getImageById(id2);

        if (!imageData1 || !imageData2) {
            console.warn('One or both images not found on canvas.');
            return;
        }

        this.baseImage = imageData1;
        this.comparisonImage = imageData2;
        this.initializeSlider();
    }

    initializeSlider() {
        if (!this.baseImage || !this.comparisonImage) return;

        this.cleanupSliderElements();

        const { sliderColor, sliderWidth, handleRadius, handleStrokeWidth, handleStrokeColor } = this.options;

        try {
            this.sliderLine = new fabric.Line(
                [this.canvas.width / 2, 0, this.canvas.width / 2, this.canvas.height],
                {
                    id: 'sliderLine',
                    stroke: sliderColor,
                    strokeWidth: sliderWidth,
                    selectable: false,
                    hasControls: false,
                    evented: false,
                    originX: 'center',
                    visible: true
                }
            );

            this.sliderHandle = new fabric.Circle({
                id: 'sliderHandle',
                left: this.canvas.width / 2,
                top: this.canvas.height / 2,
                radius: handleRadius,
                fill: sliderColor,
                stroke: handleStrokeColor,
                strokeWidth: handleStrokeWidth,
                originX: 'center',
                originY: 'center',
                selectable: true,
                hasBorders: false,
                hasControls: false,
                evented: true,
                hoverCursor: 'move',
                perPixelTargetFind: true
            });

            this.canvas.add(this.sliderLine);
            this.canvas.add(this.sliderHandle);

            this.ensureSliderOnTop();

            this.updateClipPath();
            this.isInitialized = true;

            console.log('Slider initialized successfully');
            this.canvasManager.emit('slider:initialized', {
                baseImage: this.baseImage,
                comparisonImage: this.comparisonImage
            });
        } catch (error) {
            console.error('Error initializing slider:', error);
            this.cleanupSliderElements();
        }
    }

    updateSliderElements() {
        if (!this.isReady()) return;

        const zoom = this.canvas.getZoom();

        this.sliderLine.set({
            x1: this.sliderHandle.left,
            x2: this.sliderHandle.left,
            y1: 0,
            y2: this.canvas.height
        });

        const scaledRadius = this.options.handleRadius / zoom;
        const scaledStroke = this.options.handleStrokeWidth / zoom;

        this.sliderHandle.set({
            radius: scaledRadius,
            strokeWidth: scaledStroke
        });

        this.ensureSliderOnTop();
    }

    updateClipPath() {
        if (!this.isReady()) return;

        try {
            const imageWidth = this.comparisonImage.getScaledWidth();
            const leftEdge = this.comparisonImage.left - imageWidth / 2;

            this.comparisonImage.clipPath = new fabric.Rect({
                originX: 'left',
                originY: 'top',
                left: leftEdge,
                top: 0,
                width: this.sliderHandle.left - leftEdge,
                height: this.canvas.height,
                absolutePositioned: true
            });

            this.canvas.requestRenderAll();
            console.log('Clip path updated');
        } catch (error) {
            console.error('Error updating clip path:', error);
        }
    }

    onViewportChanged({ transform }) {
        if (!this.isReady()) return;
        this.updateSliderElements();
        this.updateClipPath();
        this.ensureSliderOnTop();
    }

    onMouseDown(event) {
        if (!this.isReady()) return;

        const pointer = this.canvas.getPointer(event.e);
        const zoom = this.canvas.getZoom();
        const handleRadius = this.options.handleRadius / zoom;

        const dx = pointer.x - this.sliderHandle.left;
        const dy = pointer.y - this.sliderHandle.top;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= handleRadius * 1.5) {
            this.isDragging = true;
            this.canvas.defaultCursor = 'move';
            this.ensureSliderOnTop();

            event.e.preventDefault();
            event.e.stopPropagation();
            console.log('Slider handle drag started');
        }
    }

    onMouseMove(event) {
        if (!this.isReady() || !this.isDragging) return;

        const pointer = this.canvas.getPointer(event.e);

        const imageWidth = this.baseImage.getScaledWidth();
        const leftEdge = this.baseImage.left - imageWidth / 2;
        const rightEdge = this.baseImage.left + imageWidth / 2;

        const newX = Math.max(leftEdge, Math.min(pointer.x, rightEdge));

        this.sliderHandle.set({
            left: newX,
            top: Math.max(
                this.options.topMargin,
                Math.min(pointer.y, this.canvas.height - this.options.bottomMargin)
            )
        });

        this.updateSliderElements();
        this.updateClipPath();
        this.ensureSliderOnTop();

        this.canvas.requestRenderAll();
        event.e.preventDefault();
        event.e.stopPropagation();
        console.log(`Slider handle moved to (${newX}, ${this.sliderHandle.top})`);
    }

    onMouseUp(event) {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.defaultCursor = 'default';
            this.ensureSliderOnTop();
            this.canvas.requestRenderAll();

            if (event.e) {
                event.e.preventDefault();
                event.e.stopPropagation();
            }
            console.log('Slider handle drag ended');
        }
    }

    onMouseDoubleClick(e) {
        if (!this.isReady()) return;

        const pointer = this.canvas.getPointer(e.e);
        const zoom = this.canvas.getZoom();
        const handleRadius = this.options.handleRadius / zoom;

        const dx = pointer.x - this.sliderHandle.left;
        const dy = pointer.y - this.sliderHandle.top;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= handleRadius * 1.5) {
            this.sliderLine.visible = !this.sliderLine.visible;
            this.canvas.requestRenderAll();
            console.log(`Slider line visibility toggled to ${this.sliderLine.visible}`);
        } else if (!this.animating) {
            this.animateSlider();
        } else {
            this.animating = false;
            console.log('Slider animation stopped');
        }
    }

    animateSlider() {
        if (!this.isReady()) return;

        this.animating = true;
        const imageWidth = this.baseImage.getScaledWidth();
        const leftEdge = this.baseImage.left - imageWidth / 2;
        const rightEdge = this.baseImage.left + imageWidth / 2;

        const startPosition = this.sliderHandle.left;
        const endValue = this.moveRight ? rightEdge : leftEdge;
        const distance = Math.abs(endValue - startPosition);
        const duration = (distance / (rightEdge - leftEdge)) * 1500;

        console.log(`Animating slider from ${startPosition} to ${endValue} over ${duration}ms`);

        fabric.util.animate({
            startValue: startPosition,
            endValue: endValue,
            duration: duration,
            onChange: (value) => {
                if (!this.animating || !this.isReady()) return;
                const adjustedValue = Math.max(leftEdge, Math.min(value, rightEdge));
                this.sliderHandle.set({ left: adjustedValue });
                this.updateSliderElements();
                this.updateClipPath();
                this.ensureSliderOnTop();
                this.canvas.requestRenderAll();
                console.log(`Slider handle animating to (${adjustedValue}, ${this.sliderHandle.top})`);
            },
            onComplete: () => {
                if (this.pingPong && this.animating && this.isReady()) {
                    this.moveRight = !this.moveRight;
                    this.animateSlider();
                } else {
                    this.animating = false;
                    this.updateClipPath();
                    this.ensureSliderOnTop();
                    console.log('Slider animation completed');
                }
            }
        });
    }

    cleanupSliderElements() {
        if (this.sliderLine) {
            this.canvas.remove(this.sliderLine);
            this.sliderLine = null;
            console.log('Slider line removed');
        }
        if (this.sliderHandle) {
            this.canvas.remove(this.sliderHandle);
            this.sliderHandle = null;
            console.log('Slider handle removed');
        }
        if (this.comparisonImage && this.comparisonImage.clipPath) {
            this.comparisonImage.clipPath = null;
            console.log('Clip path removed from comparison image');
        }
        this.isInitialized = false;
        this.isDragging = false;
    }

    destroySlider() {
        console.log('Destroying slider');
        this.cleanupSliderElements();

        if (this.options.mode === 'Multi') {
            this.resetMultiModeSelection();
        }
    }

    destroy() {
        this.animating = false;

        this.canvasManager.off('image:loaded', this.onImageLoaded);
        this.canvasManager.off('image:removed', this.onImageRemoved);
        this.canvasManager.off('image:list:updated', this.onImageListUpdated);
        this.canvasManager.off('viewport:changed', this.onViewportChanged);

        this.canvas.off('mouse:down', this.onMouseDown);
        this.canvas.off('mouse:move', this.onMouseMove);
        this.canvas.off('mouse:up', this.onMouseUp);
        this.canvas.off('mouse:out', this.onMouseUp);
        this.canvas.off('mouse:dblclick', this.onMouseDoubleClick);
        this.canvas.off('after:render', this.onAfterRender);

        this.destroySlider();

        if (this.multiModeUI) {
            this.multiModeUI.remove();
            this.multiModeUI = null;
        }

        this.baseImage = null;
        this.comparisonImage = null;
        this.images = [];

        this.canvas.requestRenderAll();
        console.log('ImageCompareSliderPlugin destroyed');
    }


    initializeMultiModeSelector() {
        this.multiModeUI = document.createElement('div');
        this.multiModeUI.className = 'multi-mode-selector';
        this.multiModeUI.style.position = 'absolute';
        this.multiModeUI.style.top = '10px';
        this.multiModeUI.style.right = '10px';
        this.multiModeUI.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        this.multiModeUI.style.padding = '10px';
        this.multiModeUI.style.borderRadius = '5px';
        this.multiModeUI.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        this.multiModeUI.style.zIndex = '1000';

        const title = document.createElement('h3');
        title.textContent = 'Select Images to Compare';
        title.style.margin = '0 0 10px 0';
        this.multiModeUI.appendChild(title);

        this.imageListContainer = document.createElement('div');
        this.imageListContainer.className = 'image-list-container';
        this.imageListContainer.style.maxHeight = '200px';
        this.imageListContainer.style.overflowY = 'auto';
        this.multiModeUI.appendChild(this.imageListContainer);

        this.compareButton = document.createElement('button');
        this.compareButton.textContent = 'Compare Selected';
        this.compareButton.disabled = true;
        this.compareButton.style.marginTop = '10px';
        this.multiModeUI.appendChild(this.compareButton);

        const pluginUIContainer = document.getElementById('pluginUIContainer');
        if (pluginUIContainer) {
            pluginUIContainer.appendChild(this.multiModeUI);
        } else {
            console.warn('pluginUIContainer element not found in the DOM.');
        }

        this.imageListContainer.addEventListener('change', this.onMultiModeSelection);
        this.compareButton.addEventListener('click', () => {
            const selectedIds = Array.from(this.imageListContainer.querySelectorAll('input[name="compareSelect"]:checked'))
                .map(input => input.value);
            if (selectedIds.length === 2) {
                this.setupSliderWithImages(selectedIds[0], selectedIds[1]);
                console.log(`Comparing images: ${selectedIds[0]} and ${selectedIds[1]}`);
            }
        });

        this.updateMultiModeUI();
    }

    updateMultiModeUI() {
        if (this.options.mode !== 'Multi') return;

        this.imageListContainer.innerHTML = '';

        this.images.forEach(img => {
            const label = document.createElement('label');
            label.style.display = 'block';
            label.style.marginBottom = '5px';
            label.innerHTML = `
                <input type="checkbox" name="compareSelect" value="${img.id}">
                Image ${img.id}
            `;
            this.imageListContainer.appendChild(label);
        });
    }

    onMultiModeSelection() {
        const checked = this.imageListContainer.querySelectorAll('input[name="compareSelect"]:checked').length;
        this.compareButton.disabled = checked !== 2;
    }

    resetMultiModeSelection() {
        if (this.multiModeUI) {
            this.multiModeUI.querySelectorAll('input[name="compareSelect"]').forEach(input => {
                input.checked = false;
            });
            this.compareButton.disabled = true;
        }
    }
}
