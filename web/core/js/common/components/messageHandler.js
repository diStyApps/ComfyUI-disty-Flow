import { WebSocketHandler } from './webSocketHandler.js';
import { updateProgress, displayImagesInDiv as displayOutputMedia } from './imagedisplay.js';
import { hideSpinner } from './utils.js';
import { store } from  '../scripts/stateManagerMain.js';
class IMessageProcessor {
    process(data) {
        throw new Error('Method not implemented.');
    }
}

class JSONMessageProcessor extends IMessageProcessor {
    constructor(messageHandler) {
        super();
        this.messageHandler = messageHandler;
    }

    async process(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            switch (data.type) {
                case 'progress':
                    this.messageHandler.handleProgress(data.data);
                    break;
                case 'crystools.monitor':
                    // this.messageHandler.handleMonitor(data.data);
                    break;
                case 'executed':
                    this.messageHandler.handleExecuted(data.data);
                    break;
                case 'execution_interrupted':
                    this.messageHandler.handleInterrupted();
                    break;
                case 'status':
                    this.messageHandler.handleStatus();
                    break;
                case 'executing':
                case 'execution_start':
                case 'execution_cached':
                case 'execution_success':
                    break;
                case 'execution_error':
                    hideSpinner();
                    break;
                default:
                    console.log('Unhandled message type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing JSON message:', error);
            hideSpinner();
        }
    }
}

async function detectMimeType(blob) {
    const signatureMap = {
        '89504E47': 'image/png',
        'FFD8FF': 'image/jpeg',
        '47494638': 'image/gif',
        '424D': 'image/bmp',
        '52494646': 'audio/wav',
        '00000018': 'video/mp4',
        '00000020': 'video/mp4',
        '66747970': 'video/mp4',
    };

    const arrayBuffer = await blob.slice(0, 8).arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let hex = '';
    uint8Array.forEach(byte => {
        hex += byte.toString(16).padStart(2, '0').toUpperCase();
    });

    for (const signature in signatureMap) {
        if (hex.startsWith(signature)) {
            return signatureMap[signature];
        }
    }

    return null;
}


class BlobMessageProcessor extends IMessageProcessor {
    constructor(messageHandler) {
        super();
        this.messageHandler = messageHandler;
    }

    async process(blob) {
        try {
            let result = {};

            if (!blob.type) {
                const headerSize = 8; 
                if (blob.size <= headerSize) {
                    console.error('Blob size is too small to contain valid image data.');
                    hideSpinner();
                    result.error = 'Blob size is too small to contain valid image data.';
                    return result;
                }
                const slicedBlob = blob.slice(headerSize);
                const detectedType = await detectMimeType(slicedBlob);
                const objectURL = URL.createObjectURL(slicedBlob);
                if (detectedType) {
                    result = {
                        objectURL,
                        detectedType,
                        isTypeDetected: true
                    };
                } else {
                    console.error('Could not detect MIME type of Blob.');
                    hideSpinner();
                    result.error = 'Could not detect MIME type of Blob.';
                }
                return result;
            }

            if (blob.type.startsWith('image/') || blob.type.startsWith('video/')) {
                const objectURL = URL.createObjectURL(blob);
                result = {
                    objectURL,
                    detectedType: blob.type,
                    isTypeDetected: true
                };
            } else {
                console.error('Unsupported Blob type:', blob.type);
                hideSpinner();
                result.error = 'Unsupported Blob type: ' + blob.type;
            }
            return result;
        } catch (error) {
            console.error('Error processing Blob message:', error);
            hideSpinner();
            return { error };
        }
    }
}

export class MessageHandler {
    constructor() {
        this.lastImageFilenames = [];
        this.spinnerHidden = false;
        this.jsonProcessor = new JSONMessageProcessor(this);
        this.blobProcessor = new BlobMessageProcessor(this);
        this.maskModePreview = true;
        this.originalImageDataURL = null;
        this.canvasSelectedMaskOutputs = null;
        this.maskImageDataURL = null;
        this.canvasCroppedMaskOutputs = null;
        this.AlphaMaskImageDataURL = null;
        this.imageDataType = null;
    }

    setOriginalImage(dataURL) {
        if (!dataURL || typeof dataURL !== 'string') {
            console.error('Original image Data URL is invalid.');
            return;
        }
        this.originalImageDataURL = dataURL;
        // console.log('Original image set for MaskModePreview.');
    }
    setAlphaMaskImage(dataURL) {
        if (!dataURL || typeof dataURL !== 'string') {
            console.error('Alpha mask image Data URL is invalid.');
            return;
        }
        this.AlphaMaskImageDataURL = dataURL;
        // console.log('Alpha mask image set for MaskModePreview.');
    }
    setCanvasSelectedMaskOutputs(dataURL) {
        if (!dataURL || typeof dataURL !== 'string') {
            console.error('Canvas Selected Mask Outputs should be an array of Data URLs.');
            return;
        }
        this.canvasSelectedMaskOutputs = dataURL;
        // console.log('Canvas Selected Mask Outputs set successfully.');
    }
    setCroppedMaskImage(dataURL) {
        if (!dataURL || typeof dataURL !== 'string') {
            console.error('Canvas Cropped Mask Outputs should be an array of Data URLs.');
            return;
        }
        this.canvasCroppedMaskOutputs = dataURL;
        // console.log('Canvas Cropped Mask Outputs set successfully.');
    }
    setMaskImage(dataURL) {
        if (!dataURL || typeof dataURL !== 'string') {
            console.error('Mask image Data URL is invalid.');
            return;
        }
        this.maskImageDataURL = dataURL;
        // console.log('Mask image set for MaskModePreview.');
    }

    handlePreviewOutput(result) {
        if (result.error) {
            console.error(result.error);
            return;
        }
        const { viewType, croppedImage, maskingType } = store.getState();
        this.imageDataType = 'previewImageData';
        if (result.isTypeDetected) {
            const { objectURL, detectedType} = result;
            switch(viewType) {
                case 'standardView':
                    this.setStandardPreview(objectURL);
                    break;
                case 'splitView':
                    this.setStandardPreview(objectURL);
                    break;                    
                case 'canvasView':
                    switch(maskingType) {
                        case 'none':
                            this.canvasPreview(objectURL)
                            break;
                        case 'full':
                            this.canvasFullMaskPreview(objectURL);
                            break;
                        case 'cropped':
                            this.canvasCroppedMaskPreview(objectURL, croppedImage);
                            break;
                    }
                    break;
                default:
                    console.warn('Unknown viewType type:', viewType);
            }
        } else {
            console.error('Type not detected or unsupported.');
        }
    }

    handlePreviewOutputMessage(event) {
        if (typeof event.data === 'string') {
            this.jsonProcessor.process(event.data);
        } else if (event.data instanceof Blob) {
            this.blobProcessor.process(event.data).then(result => {
                this.handlePreviewOutput(result);
            });
        } else {
            console.warn('Unknown message type:', typeof event.data);
        }
    }    

    handleProgress(data) {
        this.hideSpinnerOnce();
        updateProgress(data.max, data.value);
    }
    hideSpinnerOnce() {
        if (!this.spinnerHidden) {
            hideSpinner();
            this.spinnerHidden = true;
        }
    }
    handleMonitor(data) {
        console.log('Monitor data received:', data);
    }

    handleExecuted(data) {
        if (data.output) {
            if ('images' in data.output) {
                this.processFinalImageOutput(data.output.images);
            }
            //gifs = videos
            if ('gifs' in data.output) {
                this.processFinalVideoOutput(data.output.gifs);
            }
        }
        hideSpinner();

        // console.log('Execution completed:', data);
        const event = new CustomEvent('jobCompleted');
        window.dispatchEvent(event);
    }

    async processFinalImageOutput(images) {
        const newImageFilenames = [];
        const imageUrls = images.map(image => {
            const { filename } = image;
    
            if (filename.includes('ComfyUI_temp')) {
                return null;
            }

            if (this.lastImageFilenames.includes(filename)) {
                // console.log('Duplicate image:', filename);
                return null;
            }
    
            newImageFilenames.push(filename);
            const imageUrl = `/view?filename=${encodeURIComponent(filename)}`;
            console.log('processImages Image URL:', imageUrl);
            return imageUrl;
        }).filter(url => url !== null);

        if (imageUrls.length > 0) {
            displayOutputMedia(imageUrls); 
            this.displayPreviewOutput(imageUrls)
            this.lastImageFilenames = newImageFilenames;
            return imageUrls;
        }
    }

    displayPreviewOutput(imageUrls) {
        for (const url of imageUrls) {
            try {
                const { viewType } = store.getState();
                if (viewType === 'canvasView') {
                    this.imageDataType = 'finalImageData';
                    this.emitCombinedImage(url)
                }
            } catch (error) {
                console.error('Error overlaying preview on image:', url, error);
            }
        }
    }
    
    processFinalVideoOutput(videos) {
        const videosUrls = videos.map(video => {
            const { filename } = video;
            const videoUrl = `/view?filename=${encodeURIComponent(filename)}`;
            return videoUrl;
        });

        displayOutputMedia(videosUrls); 
    }

    handleInterrupted() {
        hideSpinner();
        console.log('Execution Interrupted');

        const event = new CustomEvent('jobInterrupted');
        window.dispatchEvent(event);
    }

    handleStatus() {
        updateProgress();
    }

    setStandardPreview(mediaUrl, addToHistory = false) {
        displayOutputMedia([mediaUrl], addToHistory);
    }


    async canvasPreview(objectURL) {
        this.emitCombinedImage(objectURL);

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
            const JPEG_QUALITY = 0.7;

            const combinedDataURL = mainCanvas.toDataURL('image/webp', JPEG_QUALITY);
            if (combinedDataURL) {
                this.emitCombinedImage(combinedDataURL);
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
    
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = scaledMaskImage.width;
            maskCanvas.height = scaledMaskImage.height;
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
    
            if (minX > maxX || minY > maxY) {
                console.warn('Mask is fully transparent. No area to overlay preview.');
                // Optionally display the original image
                // displayImagesInDiv([this.originalImageDataURL], '', false);
                return this.originalImageDataURL;
            }
    
            const maskedWidth = maxX - minX;
            const maskedHeight = maxY - minY;
    
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
    
            const canvas = document.createElement('canvas');
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            const ctx = canvas.getContext('2d');
    
            ctx.drawImage(originalImage, 0, 0);
    
            const clippingCanvas = document.createElement('canvas');
            clippingCanvas.width = originalImage.width;
            clippingCanvas.height = originalImage.height;
            const clippingCtx = clippingCanvas.getContext('2d');
            clippingCtx.drawImage(maskCanvas, 0, 0);
    
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = originalImage.width;
            tempCanvas.height = originalImage.height;
            const tempCtx = tempCanvas.getContext('2d');
    
            tempCtx.drawImage(previewImage, previewX, previewY, previewWidth, previewHeight);
    
            tempCtx.globalCompositeOperation = 'destination-in';
            tempCtx.drawImage(clippingCanvas, 0, 0);
    
            tempCtx.globalCompositeOperation = 'source-over';
    
            ctx.drawImage(tempCanvas, 0, 0);
    
            const JPEG_QUALITY = 0.7;

            const combinedDataURL = canvas.toDataURL('image/webp', JPEG_QUALITY);
   
            return combinedDataURL;
    
        } catch (error) {
            console.error('Error during image compositing:', error);
            return null;
        }
    }

    async loadImages(urls) {
        return Promise.all(urls.map(url => this.loadImage(url)));
    }

    createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
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

    emitCombinedImage(combinedDataURL) {
        if (!combinedDataURL) {
            console.error('No combined image data to emit.');
            return;
        }
        // console.log('Emitting combined image imageDataType.',);
        const previewImageEvent = new CustomEvent(this.imageDataType, {
            detail: combinedDataURL
        });
        window.dispatchEvent(previewImageEvent);
    }

    async canvasFullMaskPreview(previewUrl, invertMask = true) {
        const combinedDataURL = await this.compositePreviewOnOriginal(previewUrl, invertMask);
        
        if (combinedDataURL) {
            this.emitCombinedImage(combinedDataURL);
        }
        return combinedDataURL;
    }

    async scaleImage(img, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const scaledImage = await this.loadImage(canvas.toDataURL());
        return scaledImage;
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = src;
        });
    }
}

const messageHandler = new MessageHandler();
export { messageHandler };

export function initializeWebSocket(clientId) {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const serverAddress = `${window.location.hostname}:${window.location.port}`;
    const wsHandler = new WebSocketHandler(
        `${protocol}://${serverAddress}/ws?clientId=${encodeURIComponent(clientId)}`,
        (event) => messageHandler.handlePreviewOutputMessage(event)
    );
    wsHandler.connect();
    return wsHandler;
}
