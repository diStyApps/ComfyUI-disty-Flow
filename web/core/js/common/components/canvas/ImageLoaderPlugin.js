
import { CanvasPlugin } from './CanvasPlugin.js';

export class ImageLoaderPlugin extends CanvasPlugin {
    constructor(options = {}) {
        super('ImageLoaderPlugin');

        this.options = {
            mode: 'Single', // 'Single' or 'Multi'
            ...options
        };

        this.canvasManager = null;
        this.canvas = null;

        this.uiContainer = null;
        this.toggleButton = null;
        this.loadButton = null;
        this.fileInput = null;

        this.loadedImages = []; 
        this.originalImages = {};

        this.onImageDrop = this.onImageDrop.bind(this);
        this.onDoubleClick = this.onDoubleClick.bind(this);
        this.onToggleMode = this.onToggleMode.bind(this);
        this.onCanvasResized = this.onCanvasResized.bind(this);
        this.onDragOver = this.onDragOver.bind(this);
        this.onImageRemove = this.onImageRemove.bind(this);
        this.onLoadButtonClick = this.onLoadButtonClick.bind(this);
        this.onFileInputChange = this.onFileInputChange.bind(this);

        this.handlePreviewImageLoaded = this.handlePreviewImageLoaded.bind(this);
    }

    init(canvasManager) {
        this.canvasManager = canvasManager;
        this.canvas = canvasManager.canvas;

        this.createUI();

        this.attachEventListeners();

        this.canvasManager.on('canvas:resized', this.onCanvasResized);

        this.canvasManager.on('image:remove', this.onImageRemove); 
        
        window.addEventListener('previewImageLoaded', this.handlePreviewImageLoaded);


    }

    createUI() {
        if (!document.querySelector('style[data-plugin="image-loader"]')) {
            const styleSheet = document.createElement('style');
            styleSheet.setAttribute('data-plugin', 'image-loader');
            styleSheet.textContent = `
                .il-container * {
                    box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }
                
                .il-container {
                    display: inline-flex;
                    padding: 0.5rem;
                    gap: 0.5rem;
                }

                .il-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.5rem;
                    background: var(--color-button-primary, #007BFF);
                    border: none;
                    cursor: pointer;
                    transition: background 0.2s;
                    color: var(--color-primary-text, #FFFFFF);
                    height: 36px;
                }

                .il-button:hover {
                    background: var(--color-button-primary-hover, #0056b3);
                }

                .il-button svg {
                    width: 1.25rem;
                    height: 1.25rem;
                }

                .il-toggle-button[data-mode="Multi"] {
                    border: 1px dashed var(--color-button-secondary-text-active, #FFC107);
                }

                .il-hidden-file-input {
                    display: none;
                }
                /* Temporary fix for hidden future functionality */
                #toggleModeBtn {
                    display: none;
                }
            `;
            document.head.appendChild(styleSheet);
        }

        this.uiContainer = document.createElement('div');
        this.uiContainer.className = 'il-container';

        this.renderToggleButton();

        this.renderLoadButton();

        this.createHiddenFileInput();

        const pluginUIContainer = document.getElementById('pluginUIContainer');
        if (pluginUIContainer) {
            pluginUIContainer.appendChild(this.uiContainer);
        }
    }

    renderToggleButton() {
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'il-button il-toggle-button';
        this.toggleButton.id = 'toggleModeBtn';
        this.toggleButton.setAttribute('data-mode', this.options.mode);
        this.toggleButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            ${this.options.mode}
        `;
        this.toggleButton.addEventListener('click', this.onToggleMode);
        this.uiContainer.appendChild(this.toggleButton);
    }

    renderLoadButton() {
        this.loadButton = document.createElement('button');
        this.loadButton.className = 'il-button il-load-button';
        this.loadButton.id = 'loadImageBtn';
        this.loadButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="4" width="18" height="14" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M12 14V8m0 0l3 3m-3-3l-3 3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
        `;
        this.loadButton.addEventListener('click', this.onLoadButtonClick);
        this.uiContainer.appendChild(this.loadButton);
    }

    createHiddenFileInput() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = 'image/*';
        this.fileInput.className = 'il-hidden-file-input';
        this.fileInput.addEventListener('change', this.onFileInputChange);
        document.body.appendChild(this.fileInput);
    }

    onToggleMode() {
        this.options.mode = this.options.mode === 'Single' ? 'Multi' : 'Single';
        this.toggleButton.setAttribute('data-mode', this.options.mode);
        this.toggleButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            ${this.options.mode}
        `;

        if (this.options.mode === 'Single' && this.loadedImages.length > 1) {
            const imagesToRemove = this.loadedImages.slice(0, -1);
            imagesToRemove.forEach(({ id }) => {
                this.removeImageById(id);
            });
        }
    }

    onLoadButtonClick() {
        if (this.fileInput) {
            this.fileInput.click();
        }
    }

    onFileInputChange(event) {
        const file = event.target.files[0];
        if (file) {
            this.handleImageFile(file);
        }
        event.target.value = '';
    }

    attachEventListeners() {
        this.canvas.upperCanvasEl.addEventListener('dragover', this.onDragOver);
        this.canvas.upperCanvasEl.addEventListener('drop', this.onImageDrop);
    }

    detachEventListeners() {
        this.canvas.upperCanvasEl.removeEventListener('dragover', this.onDragOver);
        this.canvas.upperCanvasEl.removeEventListener('drop', this.onImageDrop);

        if (this.toggleButton) {
            this.toggleButton.removeEventListener('click', this.onToggleMode);
        }

        if (this.loadButton) {
            this.loadButton.removeEventListener('click', this.onLoadButtonClick);
        }

        if (this.fileInput) {
            this.fileInput.removeEventListener('change', this.onFileInputChange);
        }

        this.canvasManager.off('canvas:resized', this.onCanvasResized);

        this.canvasManager.off('image:remove', this.onImageRemove);
    }

    onCanvasResized({ width, height }) {
        this.loadedImages.forEach(({ imageObject, borderRect }) => {
            const img = imageObject;
            const border = borderRect;

            const strokeWidth = border.strokeWidth || 2;
            const desiredWidth = width - strokeWidth * 2;
            const desiredHeight = height - strokeWidth * 2;

            const imgAspect = img.width / img.height;
            const canvasAspect = width / height;

            let scaleFactor;
            if (imgAspect > canvasAspect) {
                scaleFactor = desiredWidth / img.width;
            } else {
                scaleFactor = desiredHeight / img.height;
            }

            img.set({
                scaleX: scaleFactor,
                scaleY: scaleFactor,
                left: width / 2,
                top: height / 2,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false,
            });

            border.set({
                scaleX: scaleFactor,
                scaleY: scaleFactor,
                left: width / 2,
                top: height / 2,
                originX: 'center',
                originY: 'center',
            });
        });

        this.canvas.requestRenderAll();
    }

    onDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    onImageDrop(event) {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files && files[0]) {
            this.handleImageFile(files[0]);
        }
    }

    onDoubleClick(event) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImageFile(file);
            }
        });
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    handleImageFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please drop a valid image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            fabric.Image.fromURL(e.target.result, (img) => {
                const uniqueId = `Image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                img.set({
                    id: uniqueId,
                    scaleX: 1, 
                    scaleY: 1,
                    left: this.canvas.getWidth() / 2,
                    top: this.canvas.getHeight() / 2,
                    originX: 'center',
                    originY: 'center',
                    selectable: false,
                    evented: false,
                });

                const originalWidth = img.width;
                const originalHeight = img.height;

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
                const tempCtx = tempCanvas.getContext('2d');

                img.clone((clonedImg) => {
                    tempCtx.drawImage(clonedImg._element, 0, 0);
                    const originalDataURL = tempCanvas.toDataURL('image/png');
                    this.originalImages[uniqueId] = originalDataURL;
                });

                const canvasWidth = this.canvas.getWidth();
                const canvasHeight = this.canvas.getHeight();
                const imgAspect = originalWidth / originalHeight;
                const canvasAspect = canvasWidth / canvasHeight;

                const strokeWidth = 2; 
                const desiredWidth = canvasWidth - strokeWidth * 2;
                const desiredHeight = canvasHeight - strokeWidth * 2;
                let scaleFactor;
                if (imgAspect > canvasAspect) {
                    scaleFactor = desiredWidth / originalWidth;
                } else {
                    scaleFactor = desiredHeight / originalHeight;
                }

                img.set({
                    scaleX: scaleFactor,
                    scaleY: scaleFactor,
                    left: canvasWidth / 2,
                    top: canvasHeight / 2,
                    originX: 'center',
                    originY: 'center',
                    selectable: false,
                    evented: false,
                });

                const borderRect = new fabric.Rect({
                    width: img.getScaledWidth(),
                    height: img.getScaledHeight(),
                    originX: 'center',
                    originY: 'center',
                    left: canvasWidth / 2,
                    top: canvasHeight / 2,
                    fill: 'transparent',
                    // stroke: 'rgba(255, 0, 0, 0.5)',
                    strokeWidth: strokeWidth,
                    strokeDashArray: [10, 5], 
                    strokeUniform: true,
                    selectable: false,
                    evented: false,
                    hasControls: false,
                    hasBorders: false,
                    lockMovementX: true,
                    lockMovementY: true,
                });

                this.canvas.add(img);
                this.canvas.add(borderRect);

                borderRect.bringToFront();

                this.loadedImages.push({
                    id: uniqueId,
                    imageObject: img,
                    borderRect: borderRect,
                    originalWidth: originalWidth,
                    originalHeight: originalHeight,
                    scaleFactor: scaleFactor,
                });

                if (this.options.mode === 'Single' && this.loadedImages.length > 1) {
                    const imagesToRemove = this.loadedImages.slice(0, -1);
                    imagesToRemove.forEach(({ id }) => {
                        this.removeImageById(id);
                    });
                }

                this.canvasManager.emit('image:loaded', {
                    image: img,
                    id: uniqueId,
                    originalWidth: originalWidth,
                    originalHeight: originalHeight,
                    scaleFactor: scaleFactor,
                });

                this.canvasManager.emit('image:list:updated', {
                    images: this.loadedImages.map(img => ({
                        id: img.id,
                        left: img.imageObject.left,
                        top: img.imageObject.top,
                        scaleX: img.imageObject.scaleX,
                        scaleY: img.imageObject.scaleY,
                    })),
                });
            }, { crossOrigin: 'anonymous' });
        };
        reader.readAsDataURL(file);
    }

    getOriginalImage(id) {
        if (this.loadedImages.length === 0) {
            console.warn('No images loaded.');
            return null;
        }

        if (id) {
            return this.originalImages[id] || null;
        }

        const latestImage = this.loadedImages[this.loadedImages.length - 1];
        return this.originalImages[latestImage.id] || null;
    }

    removeImageById(id) {
        const imageIndex = this.loadedImages.findIndex(img => img.id === id);
        if (imageIndex !== -1) {
            const { imageObject, borderRect } = this.loadedImages[imageIndex];
            this.canvas.remove(imageObject);
            this.canvas.remove(borderRect);
            this.loadedImages.splice(imageIndex, 1);

            delete this.originalImages[id];

            // console.log(`ImageLoaderPlugin: Removed image with ID=${id}`);
            this.canvasManager.emit('image:removed', { id });

            this.canvasManager.emit('image:list:updated', {
                images: this.loadedImages.map(img => ({
                    id: img.id,
                    left: img.imageObject.left,
                    top: img.imageObject.top,
                    scaleX: img.imageObject.scaleX,
                    scaleY: img.imageObject.scaleY,
                })),
            });

            if (this.options.mode === 'Single' && this.loadedImages.length === 0) {
                this.canvas.clear();
                // console.log('ImageLoaderPlugin: Canvas cleared in Single mode');
            }

            this.canvas.requestRenderAll();
        } else {
            console.warn(`ImageLoaderPlugin: Image with ID=${id} not found`);
        }
    }

    onImageRemove({ id }) {
        // console.log(`ImageLoaderPlugin: Received request to remove image ID=${id}`);
        this.removeImageById(id);
    }

    handlePreviewImageLoaded(event) {
        const combinedDataURL = event.detail;
        if (combinedDataURL) {
            this.loadImageFromDataURL(combinedDataURL);
            // console.log('ImageLoaderPlugin: Received and loading preview image.');
        } else {
            console.error('ImageLoaderPlugin: No image data received in previewImageLoaded event.');
        }
    }

    loadImageFromDataURL(dataURL) {
        fetch(dataURL)
            .then(response => response.blob())
            .then(blob => {
                const file = new File([blob], 'preview.png', { type: 'image/png' });
                this.handleImageFile(file);
            })
            .catch(error => {
                console.error('ImageLoaderPlugin: Failed to convert Data URL to File.', error);
            });
    }

    destroy() {
        if (this.uiContainer && this.uiContainer.parentNode) {
            this.uiContainer.parentNode.removeChild(this.uiContainer);
        }
        this.detachEventListeners();
        this.loadedImages.forEach(({ imageObject, borderRect }) => {
            this.canvas.remove(imageObject);
            this.canvas.remove(borderRect);
        });
        this.loadedImages = [];
        this.originalImages = {};
        this.canvas.requestRenderAll();
        window.removeEventListener('previewImageLoaded', this.handlePreviewImageLoaded);
    }
}
