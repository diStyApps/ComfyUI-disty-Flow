import { store } from '../scripts/stateManagerMain.js';
import { displayImagesInDiv as displayOutputMedia } from './imagedisplay.js';

export class PreviewManager {
    constructor() {
        this.originalImageDataURL = null;
        this.canvasSelectedMaskOutputs = null;
        this.canvasCroppedMaskOutputs = null;
        this.AlphaMaskImageDataURL = null;
        this.maskImageDataURL = null;
        this.imageDataType = null;
    }

    setOriginalImage(dataURL) {
        if (!dataURL || typeof dataURL !== 'string') {
            console.error('Original image Data URL is invalid.');
            return;
        }
        this.originalImageDataURL = dataURL;
    }

    setAlphaMaskImage(dataURL) {
        if (!dataURL || typeof dataURL !== 'string') {
            console.error('Alpha mask image Data URL is invalid.');
            return;
        }
        this.AlphaMaskImageDataURL = dataURL;
    }

    setCanvasSelectedMaskOutputs(dataURL) {
        if (!dataURL || typeof dataURL !== 'string') {
            console.error('Canvas Selected Mask Outputs should be an array of Data URLs.');
            return;
        }
        this.canvasSelectedMaskOutputs = dataURL;
    }

    setCroppedMaskImage(dataURL) {
        if (!dataURL || typeof dataURL !== 'string') {
            console.error('Canvas Cropped Mask Outputs should be an array of Data URLs.');
            return;
        }
        this.canvasCroppedMaskOutputs = dataURL;
    }

    setMaskImage(dataURL) {
        if (!dataURL || typeof dataURL !== 'string') {
            console.error('Mask image Data URL is invalid.');
            return;
        }
        this.maskImageDataURL = dataURL;
    }

    getImageDataType() {
        return this.imageDataType;
    }

    setImageDataType(type) {
        this.imageDataType = type;
    }

    handlePreviewOutput(result) {
        if (result.error) {
            console.error(result.error);
            return;
        }

        const { viewType, croppedImage, maskingType } = store.getState();
        this.imageDataType = 'previewImageData';

        if (result.isTypeDetected) {
            const { objectURL } = result;
            switch (viewType) {
                case 'standardView':
                case 'splitView':
                    this.setStandardPreview(objectURL);
                    break;
                case 'canvasView':
                    this.handleCanvasViewPreview(objectURL, maskingType, croppedImage);
                    break;
                default:
                    console.warn('Unknown viewType type:', viewType);
            }
        } else {
            console.error('Type not detected or unsupported.');
        }
    }

    setStandardPreview(mediaUrl, addToHistory = false) {
        displayOutputMedia([mediaUrl], addToHistory);
    }

    handleCanvasViewPreview(objectURL, maskingType, croppedImage) {
        switch (maskingType) {
            case 'none':
                this.canvasPreview(objectURL);
                break;
            case 'full':
                this.canvasFullMaskPreview(objectURL);
                break;
            case 'cropped':
                this.canvasCroppedMaskPreview(objectURL, croppedImage);
                break;
        }
    }

    async canvasPreview(objectURL) {
        await this.emitCombinedImage(objectURL);
    }

    async canvasCroppedMaskPreview(previewUrl, croppedImage) {
        if (!this.originalImageDataURL || !this.canvasCroppedMaskOutputs) {
            console.error('Original image data URL or mask is not provided. Cannot overlay preview.');
            return null;
        }

        try {
            const [originalImage, previewImage, maskImage] = await this.loadImages([
                this.originalImageDataURL,
                previewUrl,
                this.canvasCroppedMaskOutputs
            ]);

            const { x, y, width, height } = croppedImage.mask;
            const mainCanvas = this.createCanvas(originalImage.width, originalImage.height);
            const mainCtx = mainCanvas.getContext('2d');
            mainCtx.drawImage(originalImage, 0, 0);

            const maskedPreview = this.prepareMaskedPreview(previewImage, maskImage, width, height);
            mainCtx.drawImage(maskedPreview, x, y, width, height);

            const combinedDataURL = mainCanvas.toDataURL('image/webp', 0.7);
            if (combinedDataURL) {
                await this.emitCombinedImage(combinedDataURL);
            }
            return combinedDataURL;
        } catch (error) {
            console.error('Error during compositing:', error);
            return null;
        }
    }

    async compositePreviewOnOriginal(previewUrl, invertMask = true) {
        if (!this.originalImageDataURL || !this.AlphaMaskImageDataURL) {
            console.error('Original image or mask image is not set. Cannot overlay preview.');
            return null;
        }

        try {
            const [originalImage, previewImage, maskImage] = await Promise.all([
                this.loadImage(this.originalImageDataURL),
                this.loadImage(previewUrl),
                this.loadImage(this.AlphaMaskImageDataURL)
            ]);

            let scaledMaskImage = maskImage;
            if (maskImage.width !== originalImage.width || maskImage.height !== originalImage.height) {
                console.warn('Mask dimensions do not match original image. Scaling mask to match.');
                scaledMaskImage = await this.scaleImage(maskImage, originalImage.width, originalImage.height);
            }

            const maskCanvas = this.createCanvas(scaledMaskImage.width, scaledMaskImage.height);
            const maskCtx = maskCanvas.getContext('2d');

            const FEATHER_RADIUS = 5;
            maskCtx.filter = `blur(${FEATHER_RADIUS}px)`;
            maskCtx.drawImage(scaledMaskImage, 0, 0, maskCanvas.width, maskCanvas.height);
            maskCtx.filter = 'none';

            const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
            const maskData = maskImageData.data;

            if (invertMask) {
                for (let i = 3; i < maskData.length; i += 4) {
                    maskData[i] = 255 - maskData[i];
                }
                maskCtx.putImageData(maskImageData, 0, 0);
            }

            const { minX, minY, maxX, maxY } = this.findMaskBounds(maskCanvas, maskData);
            if (minX > maxX || minY > maxY) {
                console.warn('Mask is fully transparent. No area to overlay preview.');
                return this.originalImageDataURL;
            }

            const maskedWidth = maxX - minX;
            const maskedHeight = maxY - minY;

            const { previewX, previewY, previewWidth, previewHeight } =
                this.calculatePreviewDimensions(previewImage, maskedWidth, maskedHeight, minX, minY);

            const canvas = this.createCanvas(originalImage.width, originalImage.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(originalImage, 0, 0);

            const clippingCanvas = this.createCanvas(originalImage.width, originalImage.height);
            const clippingCtx = clippingCanvas.getContext('2d');
            clippingCtx.drawImage(maskCanvas, 0, 0);

            const tempCanvas = this.createCanvas(originalImage.width, originalImage.height);
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(previewImage, previewX, previewY, previewWidth, previewHeight);
            tempCtx.globalCompositeOperation = 'destination-in';
            tempCtx.drawImage(clippingCanvas, 0, 0);
            tempCtx.globalCompositeOperation = 'source-over';

            ctx.drawImage(tempCanvas, 0, 0);

            const combinedDataURL = canvas.toDataURL('image/webp', 0.7);
            return combinedDataURL;

        } catch (error) {
            console.error('Error during image compositing:', error);
            return null;
        }
    }

    async canvasFullMaskPreview(previewUrl, invertMask = true) {
        const combinedDataURL = await this.compositePreviewOnOriginal(previewUrl, invertMask);
        if (combinedDataURL) {
            await this.emitCombinedImage(combinedDataURL);
        }
        return combinedDataURL;
    }

    findMaskBounds(maskCanvas, maskData) {
        let minX = maskCanvas.width, minY = maskCanvas.height, maxX = 0, maxY = 0;
        for (let y = 0; y < maskCanvas.height; y++) {
            for (let x = 0; x < maskCanvas.width; x++) {
                const idx = (y * maskCanvas.width + x) * 4;
                if (maskData[idx + 3] > 0) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        return { minX, minY, maxX, maxY };
    }

    calculatePreviewDimensions(previewImage, maskedWidth, maskedHeight, minX, minY) {
        const MIN_SCALE = 1;
        const previewAspect = previewImage.width / previewImage.height;
        const maskAspect = maskedWidth / maskedHeight;

        let previewWidth, previewHeight, previewX, previewY;

        if (previewAspect > maskAspect) {
            let scale = maskedHeight / previewImage.height;
            scale = Math.max(scale, MIN_SCALE);
            previewWidth = previewImage.width * scale;
            previewHeight = previewImage.height * scale;
            previewX = minX + (maskedWidth - previewWidth) / 2;
            previewY = minY;
        } else {
            let scale = maskedWidth / previewImage.width;
            scale = Math.max(scale, MIN_SCALE);
            previewWidth = previewImage.width * scale;
            previewHeight = previewImage.height * scale;
            previewX = minX;
            previewY = minY + (maskedHeight - previewHeight) / 2;
        }

        previewX = minX + (maskedWidth - previewWidth) / 2;
        previewY = minY + (maskedHeight - previewHeight) / 2;

        return { previewX, previewY, previewWidth, previewHeight };
    }

    prepareMaskedPreview(previewImage, maskImage, width, height) {
        const maskCanvas = this.createCanvas(width, height);
        const previewCanvas = this.createCanvas(width, height);

        const maskCtx = maskCanvas.getContext('2d');
        const previewCtx = previewCanvas.getContext('2d');

        const BLUR_RADIUS = 3;
        maskCtx.filter = `blur(${BLUR_RADIUS}px)`;
        maskCtx.drawImage(maskImage, 0, 0, width, height);
        maskCtx.filter = 'none';

        previewCtx.drawImage(previewImage, 0, 0, width, height);

        const blurredMaskData = maskCtx.getImageData(0, 0, width, height);
        const previewData = previewCtx.getImageData(0, 0, width, height);
        const maskedData = this.applyMaskToAlpha(previewData, blurredMaskData);
        previewCtx.putImageData(maskedData, 0, 0);

        return previewCanvas;
    }

    applyMaskToAlpha(previewData, maskData) {
        const data = previewData.data;
        const mask = maskData.data;

        if (data.length !== mask.length) {
            throw new Error('Preview and mask ImageData must have the same dimensions.');
        }

        for (let i = 0; i < data.length; i += 4) {
            const maskAlpha = mask[i];
            const normalizedAlpha = maskAlpha / 255;
            data[i + 3] = normalizedAlpha * data[i + 3];
        }

        return previewData;
    }

    async emitCombinedImage(combinedDataURL) {
        if (!combinedDataURL) {
            console.error('No combined image data to emit.');
            return null;
        }

        const previewImageEvent = new CustomEvent(this.imageDataType, {
            detail: combinedDataURL
        });
        window.dispatchEvent(previewImageEvent);
        return combinedDataURL;
    }

    async scaleImage(img, width, height) {
        const canvas = this.createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const scaledImage = await this.loadImage(canvas.toDataURL());
        return scaledImage;
    }

    createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    async loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = src;
        });
    }

    async loadImages(urls) {
        return Promise.all(urls.map(url => this.loadImage(url)));
    }

    displayFinalMediaOutput(imageUrls) {
        if (imageUrls.length > 0) {
            displayOutputMedia(imageUrls); 
        }
    }
}
export default PreviewManager;