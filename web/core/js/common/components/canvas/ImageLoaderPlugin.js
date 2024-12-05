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

        this.handleFinalImageData = this.handleFinalImageData.bind(this);
        this.handlePreviewImageData = this.handlePreviewImageData.bind(this);
    }

    init(canvasManager) {
        this.canvasManager = canvasManager;
        this.canvas = canvasManager.canvas;
        this.createUI();
        this.attachEventListeners();
        this.canvasManager.on('canvas:resized', this.onCanvasResized);
        this.canvasManager.on('image:remove', this.onImageRemove); 
        window.addEventListener('finalImageData', this.handleFinalImageData);
        window.addEventListener('previewImageData', this.handlePreviewImageData);
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
        this.loadButton.title = 'Load Image';
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

    updateImageScaleAndPosition(img, borderRect, width, height, originalWidth, originalHeight) {
        const strokeWidth = borderRect.strokeWidth || 2;
        const desiredWidth = width - strokeWidth * 2;
        const desiredHeight = height - strokeWidth * 2;
        const imgAspect = originalWidth / originalHeight;
        const canvasAspect = width / height;

        let scaleFactor;
        if (imgAspect > canvasAspect) {
            scaleFactor = desiredWidth / originalWidth;
        } else {
            scaleFactor = desiredHeight / originalHeight;
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

        borderRect.set({
            width: img.getScaledWidth(),
            height: img.getScaledHeight(),
            scaleX: 1,
            scaleY: 1,
            left: width / 2,
            top: height / 2,
            originX: 'center',
            originY: 'center',
        });

        return scaleFactor;
    }

    onCanvasResized({ width, height }) {
        this.loadedImages.forEach((loadedImage) => {
            const { imageObject: img, borderRect, originalWidth, originalHeight } = loadedImage;
            const scaleFactor = this.updateImageScaleAndPosition(img, borderRect, width, height, originalWidth, originalHeight);
            loadedImage.scaleFactor = scaleFactor;
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

    removeImageById(id) {
        const imageIndex = this.loadedImages.findIndex(img => img.id === id);
        if (imageIndex !== -1) {
            const { imageObject, borderRect } = this.loadedImages[imageIndex];
            this.canvas.remove(imageObject);
            this.canvas.remove(borderRect);
            this.loadedImages.splice(imageIndex, 1);

            delete this.originalImages[id];

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
            }

            this.canvas.requestRenderAll();
        } else {
            console.warn(`ImageLoaderPlugin: Image with ID=${id} not found`);
        }
    }

    onImageRemove({ id }) {
        this.removeImageById(id);
    }

    async handleImageFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please drop a valid image file.');
            return;
        }

        try {
            const dataURL = await this.readFileAsDataURL(file);
            this.loadImageFromDataURL(dataURL);
        } catch (error) {
            console.error('ImageLoaderPlugin: Failed to read the image file.', error);
        }
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataURL = e.target.result;
                if (this.isValidDataURL(dataURL)) {
                    resolve(dataURL);
                } else {
                    reject(new Error('FileReader did not return a valid data URL.'));
                }
            };
            reader.onerror = () => {
                reject(new Error('Failed to read the image file.'));
            };
            reader.readAsDataURL(file);
        });
    }

    processLoadedImage(img, dataURL) {
        if (!this.isValidDataURL(dataURL)) {
            console.error('ImageLoaderPlugin: Provided dataURL is not a valid image data URL.');
            return;
        }

        const uniqueId = `Image_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

        img.set({
            id: uniqueId,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
        });

        this.originalImages[uniqueId] = dataURL;
        const originalWidth = img.width;
        const originalHeight = img.height;
        const canvasWidth = this.canvas.getWidth();
        const canvasHeight = this.canvas.getHeight();

        const borderRect = new fabric.Rect({
            fill: 'transparent',
            strokeWidth: 2,
            strokeDashArray: [10, 5], 
            strokeUniform: true,
            selectable: false,
            evented: false,
            hasControls: false,
            hasBorders: false,
            lockMovementX: true,
            lockMovementY: true,
            originX: 'center',
            originY: 'center',
        });

        const scaleFactor = this.updateImageScaleAndPosition(img, borderRect, canvasWidth, canvasHeight, originalWidth, originalHeight);

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

        this.canvas.requestRenderAll();
    }

    async handlePreviewImageData(event) {
        const imageData = event.detail;
        if (typeof imageData !== 'string') {
            console.error('ImageLoaderPlugin: Invalid image data received in previewImageData event.');
            return;
        }

        let dataURL = imageData;
        if (!this.isValidDataURL(dataURL)) {
            try {
                dataURL = await this.convertURLToDataURL(dataURL);
            } catch (error) {
                console.error('ImageLoaderPlugin: Unable to convert image URL to Data URL.', error);
                return;
            }
        }

        this.loadImageFromDataURL(dataURL);
    }

    async handleFinalImageData(event) {
        const imageData = event.detail;
        if (typeof imageData !== 'string') {
            console.error('ImageLoaderPlugin: Invalid image data received in finalImageData event.');
            return;
        }

        let dataURL = imageData;
        if (!this.isValidDataURL(dataURL)) {
            try {
                dataURL = await this.convertURLToDataURL(dataURL);
            } catch (error) {
                console.error('ImageLoaderPlugin: Unable to convert image URL to Data URL.', error);
                return;
            }
        }

        this.loadImageFromDataURL(dataURL);
    }

    isValidDataURL(dataURL) {
        return typeof dataURL === 'string' && dataURL.startsWith('data:image/');
    }

    convertURLToDataURL(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                try {
                    const convertedDataURL = canvas.toDataURL();
                    resolve(convertedDataURL);
                } catch (error) {
                    reject(new Error('Failed to convert image to Data URL.'));
                }
            };
            img.onerror = () => {
                reject(new Error('Failed to load image for conversion.'));
            };
            img.src = url;
        });
    }

    loadImageFromDataURL(dataURL) {
        if (!this.isValidDataURL(dataURL)) {
            console.error('ImageLoaderPlugin: Provided dataURL is not a valid image data URL.');
            return;
        }
        fabric.Image.fromURL(dataURL, (img) => {
            this.processLoadedImage(img, dataURL);
        }, { crossOrigin: 'anonymous' });
    }

    getOriginalImage(id) {
        // console.log("getOriginalImage", this.loadedImages, this.originalImages);
        if (this.loadedImages.length === 0) {
            console.error('No images loaded.');
            return null;
        }

        let dataURL;
        if (id) {
            dataURL = this.originalImages[id];
        } else {
            const latestImage = this.loadedImages[this.loadedImages.length - 1];
            // console.log("getOriginalImage latestImage", latestImage, this.originalImages);
            dataURL = this.originalImages[latestImage.id];
        }

        if (this.isValidDataURL(dataURL)) {
            return dataURL;
        } else {
            console.error('ImageLoaderPlugin: Original image is not a valid data URL.');
            return null;
        }
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
        window.removeEventListener('finalImageData', this.handleFinalImageData);
        window.removeEventListener('previewImageData', this.handlePreviewImageData);
    }
}
