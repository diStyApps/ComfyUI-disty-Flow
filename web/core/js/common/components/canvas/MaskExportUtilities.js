import { store } from '../../scripts/stateManagerMain.js';
export class MaskExportUtilities {
    constructor(plugin) {
        this.plugin = plugin;
        this.isSubscribed = false;

        this.config = {
            padding: 0, 
            resizeMask: true,
            resizeWidth: 0,
            resizeHeight: 0,
            resizeDimensions: 1024,
            resizeKeepProportion: true,
            blurMask: 50,
            bw: true,
        };
        this.config.resizeWidth = this.config.resizeDimensions;
        this.config.resizeHeight = this.config.resizeDimensions;
    }

    setConfig(updatedConfig) {
        this.config = { ...this.config, ...updatedConfig };
        this.config.resizeWidth = this.config.resizeDimensions;
        this.config.resizeHeight = this.config.resizeDimensions;
    }

    _getBoundingBox(canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const index = (y * canvas.width + x) * 4 + 3; 
                if (imageData[index] > 0) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        return { minX, minY, maxX, maxY };
    }

    _addPadding(canvas, padding, touchesEdges) {
        const padLeft = touchesEdges.touchesLeft ? 0 : padding;
        const padRight = touchesEdges.touchesRight ? 0 : padding;
        const padTop = touchesEdges.touchesTop ? 0 : padding;
        const padBottom = touchesEdges.touchesBottom ? 0 : padding;

        const paddedWidth = canvas.width + padLeft + padRight;
        const paddedHeight = canvas.height + padTop + padBottom;

        const paddedCanvas = document.createElement('canvas');
        paddedCanvas.width = paddedWidth;
        paddedCanvas.height = paddedHeight;
        const paddedCtx = paddedCanvas.getContext('2d', { willReadFrequently: true });

        paddedCtx.clearRect(0, 0, paddedWidth, paddedHeight);
        paddedCtx.drawImage(canvas, padLeft, padTop, canvas.width, canvas.height);

        return paddedCanvas;
    }

    _resizeCanvas(canvas, targetWidth, targetHeight, keepProportion) {
        if (!this.config.resizeMask) return canvas;

        const originalWidth = canvas.width;
        const originalHeight = canvas.height;

        let scaleX = targetWidth / originalWidth;
        let scaleY = targetHeight / originalHeight;

        if (keepProportion) {
            const scale = Math.min(scaleX, scaleY);
            scaleX = scale;
            scaleY = scale;
            targetWidth = Math.round(originalWidth * scale);
            targetHeight = Math.round(originalHeight * scale);
        }

        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = targetWidth;
        resizedCanvas.height = targetHeight;
        const resizedCtx = resizedCanvas.getContext('2d', { willReadFrequently: true });

        resizedCtx.clearRect(0, 0, targetWidth, targetHeight);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalWidth;
        tempCanvas.height = originalHeight;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.drawImage(canvas, 0, 0);

        resizedCtx.save();
        resizedCtx.scale(scaleX, scaleY);
        resizedCtx.drawImage(tempCanvas, 0, 0);
        resizedCtx.restore();

        return resizedCanvas;
    }

    _convertToAlphaMask(canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const intensity = data[i]; 
            const alpha = 255 - intensity;
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = alpha;
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    _addAlphaOnImage(imageCanvas, alphaMaskCanvas) {
        const imageCtx = imageCanvas.getContext('2d', { willReadFrequently: true });
        const alphaCtx = alphaMaskCanvas.getContext('2d', { willReadFrequently: true });

        const imageData = imageCtx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
        const maskData = alphaCtx.getImageData(0, 0, alphaMaskCanvas.width, alphaMaskCanvas.height);
        const imgDataArr = imageData.data;
        const maskDataArr = maskData.data;

        for (let i = 0; i < imgDataArr.length; i += 4) {
            const maskAlpha = maskDataArr[i + 3]; 
            imgDataArr[i + 3] = Math.min(imgDataArr[i + 3], maskAlpha);
        }

        imageCtx.putImageData(imageData, 0, 0);
        return imageCanvas;
    }

    _convertToBlackAndWhite(canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha > 0) {
                data[i] = 255;     
                data[i + 1] = 255;
                data[i + 2] = 255;
                data[i + 3] = 255; 
            } else {
                data[i] = 0;       
                data[i + 1] = 0;   
                data[i + 2] = 0;   
                data[i + 3] = 255; 
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    _applyBlur(canvas, blurAmount) {
        if (blurAmount <= 0) return canvas;

        const blurredCanvas = document.createElement('canvas');
        blurredCanvas.width = canvas.width;
        blurredCanvas.height = canvas.height;
        const blurredCtx = blurredCanvas.getContext('2d', { willReadFrequently: true });

        blurredCtx.fillStyle = 'black';
        blurredCtx.fillRect(0, 0, blurredCanvas.width, blurredCanvas.height);

        blurredCtx.filter = `blur(${blurAmount}px)`;
        blurredCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
        blurredCtx.filter = 'none';

        return blurredCanvas;
    }

    downloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    _processBoundingBox(canvas) {
        const { minX, minY, maxX, maxY } = this._getBoundingBox(canvas);

        if (maxX < minX || maxY < minY) {
            return null;
        }

        const touchesEdges = {
            touchesLeft: minX === 0,
            touchesRight: maxX === canvas.width - 1,
            touchesTop: minY === 0,
            touchesBottom: maxY === canvas.height - 1
        };

        return { minX, minY, maxX, maxY, touchesEdges };
    }

    exportCroppedAssets(overrides = {}) {
        const config = { ...this.config, ...overrides };
        if (!this.plugin.currentMask) {
            alert('No mask selected to export.');
            return null;
        }

        if (!this.plugin.imageObject) {
            alert('No image loaded to export.');
            return null;
        }

        try {
            const maskCanvas = this.plugin.currentMask.canvasEl;
            const maskBoundingBox = this._processBoundingBox(maskCanvas);
            if (!maskBoundingBox) return null;

            const { minX, minY, maxX, maxY, touchesEdges } = maskBoundingBox;
            const originalCroppedWidth = maxX - minX + 1;
            const originalCroppedHeight = maxY - minY + 1;

            const croppedMaskCanvas = document.createElement('canvas');
            croppedMaskCanvas.width = originalCroppedWidth;
            croppedMaskCanvas.height = originalCroppedHeight;
            const croppedMaskCtx = croppedMaskCanvas.getContext('2d', { willReadFrequently: true });
            croppedMaskCtx.drawImage(
                maskCanvas, 
                minX, minY, originalCroppedWidth, originalCroppedHeight,
                0, 0, originalCroppedWidth, originalCroppedHeight
            );
            
            config.padding = (croppedMaskCanvas.width * 0.2);
            const growMaskForFinalComposite = (croppedMaskCanvas.width * 0.1);
            // console.log('config.padding', config.padding);
            // console.log('(growMaskForFinalComposite',growMaskForFinalComposite);

            let processedMaskCanvas = croppedMaskCanvas;
            if (config.padding > 0) {
                processedMaskCanvas = this._addPadding(croppedMaskCanvas, config.padding, touchesEdges);
            }

            const imageCanvas = document.createElement('canvas');
            const imageCtx = imageCanvas.getContext('2d', { willReadFrequently: true });
            imageCanvas.width = this.plugin.imageOriginalWidth;
            imageCanvas.height = this.plugin.imageOriginalHeight;
            imageCtx.drawImage(
                this.plugin.imageObject.getElement(),
                0,
                0,
                imageCanvas.width,
                imageCanvas.height
            );

            const padLeft = touchesEdges.touchesLeft ? 0 : config.padding;
            const padTop = touchesEdges.touchesTop ? 0 : config.padding;
            const padRight = touchesEdges.touchesRight ? 0 : config.padding;
            const padBottom = touchesEdges.touchesBottom ? 0 : config.padding;

            const paddedMinX = Math.max(minX - padLeft, 0);
            const paddedMinY = Math.max(minY - padTop, 0);
            const paddedMaxX = Math.min(maxX + padRight, imageCanvas.width - 1);
            const paddedMaxY = Math.min(maxY + padBottom, imageCanvas.height - 1);
            const croppedImageWidth = paddedMaxX - paddedMinX + 1;
            const croppedImageHeight = paddedMaxY - paddedMinY + 1;

            const croppedImageCanvas = document.createElement('canvas');
            croppedImageCanvas.width = croppedImageWidth;
            croppedImageCanvas.height = croppedImageHeight;
            const croppedImageCtx = croppedImageCanvas.getContext('2d', { willReadFrequently: true });
            croppedImageCtx.drawImage(
                imageCanvas,
                paddedMinX, paddedMinY, croppedImageWidth, croppedImageHeight,
                0, 0, croppedImageWidth, croppedImageHeight
            );

            let finalMaskCanvas = processedMaskCanvas;
            let finalImageCanvas = croppedImageCanvas;

            if (config.resizeMask) {
                finalMaskCanvas = this._resizeCanvas(
                    processedMaskCanvas,
                    (config.resizeWidth+config.padding),
                    (config.resizeHeight+config.padding),
                    config.resizeKeepProportion
                );

                finalImageCanvas = this._resizeCanvas(
                    croppedImageCanvas,
                    (config.resizeWidth+config.padding),
                    (config.resizeHeight+config.padding),
                    config.resizeKeepProportion
                );
            }

            if (config.bw) {
                this._convertToBlackAndWhite(finalMaskCanvas);
            }

            if (config.blurMask > 0) {
                finalMaskCanvas = this._applyBlur(finalMaskCanvas, config.blurMask);
            }

            const alphaMaskCanvas = document.createElement('canvas');
            alphaMaskCanvas.width = finalMaskCanvas.width;
            alphaMaskCanvas.height = finalMaskCanvas.height;
            const alphaMaskCtx = alphaMaskCanvas.getContext('2d', { willReadFrequently: true });
            alphaMaskCtx.drawImage(finalMaskCanvas, 0, 0);

            this._convertToAlphaMask(alphaMaskCanvas);

            const alphaOnImageCanvas = document.createElement('canvas');
            alphaOnImageCanvas.width = finalImageCanvas.width;
            alphaOnImageCanvas.height = finalImageCanvas.height;
            const alphaOnImageCtx = alphaOnImageCanvas.getContext('2d', { willReadFrequently: true });
            alphaOnImageCtx.drawImage(finalImageCanvas, 0, 0);
            this._addAlphaOnImage(alphaOnImageCanvas, alphaMaskCanvas);

            const maskDataURL = finalMaskCanvas.toDataURL('image/png');
            const imageDataURL = finalImageCanvas.toDataURL('image/png');
            const alphaMaskDataURL = alphaMaskCanvas.toDataURL('image/png');
            const alphaOnImageDataURL = alphaOnImageCanvas.toDataURL('image/png');

            const croppedImage = {
                loadedImage: {
                    width: this.plugin.imageOriginalWidth,
                    height: this.plugin.imageOriginalHeight
                },
                mask: {
                    x: paddedMinX,
                    y: paddedMinY,
                    width: croppedImageWidth,
                    height: croppedImageHeight,
                    resizePaddingWidth: finalImageCanvas.width,
                    resizePaddingHeight: finalImageCanvas.height,
                    growMaskForFinalComposite: growMaskForFinalComposite
                },
            };
            
            store.dispatch({
                type: 'SET_CROPPED_IMAGE',
                payload: croppedImage
            });

            return { 
                mask: maskDataURL, 
                image: imageDataURL,
                alphaMask: alphaMaskDataURL,
                alphaOnimage: alphaOnImageDataURL
            };

        } catch (error) {
            console.error('Error exporting cropped assets:', error);
            alert('An error occurred while exporting the cropped assets.');
            return null;
        }
    }

    exportCroppedMask(overrides = {}) {
        const assets = this.exportCroppedAssets(overrides);
        return assets ? assets.mask : null;
    }

    saveCroppedMask(overrides = {}) {
        const assets = this.exportCroppedAssets(overrides);
        if (assets && assets.mask) {
            const config = { ...this.config, ...overrides };
            const filenameParts = [`${this.plugin.currentMask.name}_cropped`];
            if (config.padding > 0) {
                filenameParts.push(`padded_${config.padding}`);
            }
            if (config.resizeMask) {
                const proportion = config.resizeKeepProportion ? '_proportional' : '';
                filenameParts.push(`resized_${config.resizeWidth}x${config.resizeHeight}${proportion}`);
            }
            if (config.blurMask > 0) {
                filenameParts.push(`blurred_${config.blurMask}`);
            }
            if (config.bw) {
                filenameParts.push(`bw_${config.bw}`);
            }
            const filename = `${filenameParts.join('_')}.png`;
            this.downloadImage(assets.mask, filename);
        }
    }

    exportCroppedImage(overrides = {}) {
        const assets = this.exportCroppedAssets(overrides);
        return assets ? assets.image : null;
    }

    saveCroppedImage(overrides = {}) {
        const assets = this.exportCroppedAssets(overrides);
        if (assets && assets.image) {
            const config = { ...this.config, ...overrides };
            const filenameParts = [`${this.plugin.imageObject.name}_cropped`];
            if (config.padding > 0) {
                filenameParts.push(`padded_${config.padding}`);
            }
            if (config.resizeMask) {
                const proportion = config.resizeKeepProportion ? '_proportional' : '';
                filenameParts.push(`resized_${config.resizeWidth}x${config.resizeHeight}${proportion}`);
            }
            if (config.blurMask > 0) {
                filenameParts.push(`blurred_${config.blurMask}`);
            }
            if (config.bw) {
                filenameParts.push(`bw_${config.bw}`);
            }
            const filename = `${filenameParts.join('_')}.png`;
            this.downloadImage(assets.image, filename);
        }
    }

    exportCroppedAlphaOnImage(overrides = {}) {
        const assets = this.exportCroppedAssets(overrides);
        return assets ? assets.alphaOnimage : null;    
    }

    saveCroppedAlphaOnImage(overrides = {}) {
        const assets = this.exportCroppedAssets(overrides);
        if (assets && assets.alphaOnimage) {
            const config = { ...this.config, ...overrides };
            const filenameParts = [`${this.plugin.imageObject.name}_cropped_alphaOnImage`];
            if (config.padding > 0) {
                filenameParts.push(`padded_${config.padding}`);
            }
            if (config.resizeMask) {
                const proportion = config.resizeKeepProportion ? '_proportional' : '';
                filenameParts.push(`resized_${config.resizeWidth}x${config.resizeHeight}${proportion}`);
            }
            if (config.blurMask > 0) {
                filenameParts.push(`blurred_${config.blurMask}`);
            }
            if (config.bw) {
                filenameParts.push(`bw_${config.bw}`);
            }
            const filename = `${filenameParts.join('_')}.png`;
            this.downloadImage(assets.alphaOnimage, filename);
        }
    }

    exportCroppedAlphaMask(overrides = {}) {
        const assets = this.exportCroppedAssets(overrides);
        return assets ? assets.alphaMask : null;    
    }

    saveCroppedAlphaMask(overrides = {}) {
        const assets = this.exportCroppedAssets(overrides);
        if (assets && assets.alphaMask) {
            const config = { ...this.config, ...overrides };
            const filenameParts = [`${this.plugin.currentMask.name}_cropped_alphaMask`];
            if (config.padding > 0) {
                filenameParts.push(`padded_${config.padding}`);
            }
            if (config.resizeMask) {
                const proportion = config.resizeKeepProportion ? '_proportional' : '';
                filenameParts.push(`resized_${config.resizeWidth}x${config.resizeHeight}${proportion}`);
            }
            if (config.blurMask > 0) {
                filenameParts.push(`blurred_${config.blurMask}`);
            }
            if (config.bw) {
                filenameParts.push(`bw_${config.bw}`);
            }
            const filename = `${filenameParts.join('_')}.png`;
            this.downloadImage(assets.alphaMask, filename);
        }
    }

    // old
    createCombinedAlphaMask() {
        const alphaCanvas = document.createElement('canvas');
        alphaCanvas.width = this.plugin.imageOriginalWidth;
        alphaCanvas.height = this.plugin.imageOriginalHeight;
        const alphaCtx = alphaCanvas.getContext('2d', { willReadFrequently: true });

        alphaCtx.clearRect(0, 0, alphaCanvas.width, alphaCanvas.height);
        this.plugin.masks.forEach(mask => {
            alphaCtx.drawImage(mask.canvasEl, 0, 0, alphaCanvas.width, alphaCanvas.height);
        });

        return alphaCanvas;
    }

    exportMaskAlphaOnImage() {
        if (!this.plugin.imageObject) {
            alert('No image loaded to save the alpha on.');
            return null;
        }

        if (!this.plugin.currentMask) {
            alert('No mask selected to save as alpha.');
            return null;
        }

        try {
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = this.plugin.imageOriginalWidth;
            combinedCanvas.height = this.plugin.imageOriginalHeight;
            const combinedCtx = combinedCanvas.getContext('2d', { willReadFrequently: true });

            combinedCtx.drawImage(this.plugin.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);

            const alphaMask = document.createElement('canvas');
            alphaMask.width = this.plugin.imageOriginalWidth;
            alphaMask.height = this.plugin.imageOriginalHeight;
            const alphaCtx = alphaMask.getContext('2d', { willReadFrequently: true });
            alphaCtx.drawImage(this.plugin.currentMask.canvasEl, 0, 0, alphaMask.width, alphaMask.height);

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
        if (!this.plugin.imageObject) {
            alert('No image loaded to save the alphas on.');
            return null;
        }

        if (this.plugin.masks.length === 0) {
            alert('No masks available to save as alphas.');
            return null;
        }

        try {
            const dataURLs = this.plugin.masks.map(mask => {
                const combinedCanvas = document.createElement('canvas');
                combinedCanvas.width = this.plugin.imageOriginalWidth;
                combinedCanvas.height = this.plugin.imageOriginalHeight;
                const combinedCtx = combinedCanvas.getContext('2d', { willReadFrequently: true });

                combinedCtx.drawImage(this.plugin.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);

                const alphaMask = document.createElement('canvas');
                alphaMask.width = this.plugin.imageOriginalWidth;
                alphaMask.height = this.plugin.imageOriginalHeight;
                const alphaCtx = alphaMask.getContext('2d', { willReadFrequently: true });
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
        if (!this.plugin.imageObject) {
            alert('No image loaded to save the combined alpha on.');
            return null;
        }

        if (this.plugin.masks.length === 0) {
            alert('No masks available to save as combined alpha.');
            return null;
        }

        try {
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = this.plugin.imageOriginalWidth;
            combinedCanvas.height = this.plugin.imageOriginalHeight;
            const combinedCtx = combinedCanvas.getContext('2d', { willReadFrequently: true });

            combinedCtx.drawImage(this.plugin.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);

            const combinedMaskCanvas = this.createCombinedAlphaMask();

            combinedCtx.globalCompositeOperation = 'destination-out';
            combinedCtx.drawImage(combinedMaskCanvas, 0, 0, combinedCanvas.width, combinedCanvas.height);
            combinedCtx.globalCompositeOperation = 'source-over';

            const combinedDataURL = combinedCanvas.toDataURL('image/png');
            return combinedDataURL;

        } catch (error) {
            console.error('Error saving combined masks alpha on image:', error);
            alert('An error occurred while saving the combined masks alpha on image.');
            return null;
        }
    }

    exportMask() {
        if (!this.plugin.currentMask) {
            alert('No mask selected to export.');
            return null;
        }

        try {
            const dataURL = this.plugin.currentMask.canvasEl.toDataURL('image/png');
            return dataURL;
        } catch (error) {
            console.error('Error exporting single mask image:', error);
            alert('An error occurred while exporting the single mask image.');
            return null;
        }
    }

    exportAllMasksOnImage() {
        if (!this.plugin.imageObject) {
            alert('No image loaded to export masks on.');
            return null;
        }

        if (this.plugin.masks.length === 0) {
            alert('No masks available to export on image.');
            return null;
        }

        try {
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = this.plugin.imageOriginalWidth;
            combinedCanvas.height = this.plugin.imageOriginalHeight;
            const combinedCtx = combinedCanvas.getContext('2d', { willReadFrequently: true });

            combinedCtx.drawImage(this.plugin.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);

            this.plugin.masks.forEach(mask => {
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

    exportAllMasksCombined() {
        if (this.plugin.masks.length === 0) {
            alert('No masks available to export.');
            return null;
        }

        try {
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = this.plugin.imageOriginalWidth;
            combinedCanvas.height = this.plugin.imageOriginalHeight;
            const combinedCtx = combinedCanvas.getContext('2d', { willReadFrequently: true });

            this.plugin.masks.forEach(mask => {
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
        if (this.plugin.masks.length === 0) {
            alert('No masks available to export.');
            return null;
        }

        try {
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = this.plugin.imageOriginalWidth;
            combinedCanvas.height = this.plugin.imageOriginalHeight;
            const combinedCtx = combinedCanvas.getContext('2d', { willReadFrequently: true });

            combinedCtx.fillStyle = 'black';
            combinedCtx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

            this.plugin.masks.forEach(mask => {
                const maskCanvas = document.createElement('canvas');
                maskCanvas.width = this.plugin.imageOriginalWidth;
                maskCanvas.height = this.plugin.imageOriginalHeight;
                const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });

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
        } catch (error) {
            console.error('Error exporting masks combined black and white:', error);
            alert('An error occurred while exporting the masks combined black and white.');
            return null;
        }
    }

    exportMaskOnImage() {
        if (!this.plugin.imageObject) {
            alert('No image loaded to export mask on.');
            return null;
        }

        if (!this.plugin.currentMask) {
            alert('No mask selected to export on image.');
            return null;
        }

        try {
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = this.plugin.imageOriginalWidth;
            combinedCanvas.height = this.plugin.imageOriginalHeight;
            const combinedCtx = combinedCanvas.getContext('2d', { willReadFrequently: true });

            combinedCtx.drawImage(this.plugin.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);
            combinedCtx.drawImage(this.plugin.currentMask.canvasEl, 0, 0, combinedCanvas.width, combinedCanvas.height);

            const combinedDataURL = combinedCanvas.toDataURL('image/png');
            return combinedDataURL;
        } catch (error) {
            console.error('Error exporting single mask on image:', error);
            alert('An error occurred while exporting the single mask on image.');
            return null;
        }
    }

    exportAllMasksOnImage() {
        return this.exportAllMasksOnImage();
    }

    exportAllMasksCombinedOnImage() {
        return this.exportAllMasksCombinedAlphaOnImage();
    }

    exportAllMasksCombinedBlackWhiteOnImage() {
        return this.exportMasksCombinedBlackWhite();
    }


    saveMaskAlphaOnImage() {
        const dataURL = this.exportMaskAlphaOnImage();
        if (dataURL) {
            this.downloadImage(dataURL, `${this.plugin.currentMask.name}_alpha_on_image.png`);
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
        if (this.plugin.currentMask && this.plugin.currentMask.canvasEl) {
            const dataURL = this.exportMask();
            if (dataURL) {
                this.downloadImage(dataURL, `${this.plugin.currentMask.name}.png`);
            }
        } else {
            alert('No current mask data available to save.');
        }
    }

    saveAllMasks() {
        if (this.plugin.masks.length > 0) {
            this.plugin.masks.forEach((mask) => {
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
            this.downloadImage(dataURL, `${this.plugin.currentMask.name}_on_image.png`);
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

    exportAllMasksCombined() {
        return this.exportAllMasksCombined();
    }

    exportMasksCombinedBlackWhite() {
        return this.exportMasksCombinedBlackWhite();
    }
}
