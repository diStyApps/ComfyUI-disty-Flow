import { store } from '../../scripts/stateManagerMain.js';

export class MaskExportUtilities {
    constructor(plugin) {
        this.plugin = plugin;
        this.isSubscribed = false;

        this.config = {
            padding: 50,
            margin: 0,
            resizeMask: true,
            resizeWidth: 1024,
            resizeHeight: 1024,
            resizeKeepProportion: true,
            blurMask: 25,
            bw: true
        };
    }

    _getBoundingBox(canvas) {
        const ctx = canvas.getContext('2d');
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
        const { touchesLeft, touchesRight, touchesTop, touchesBottom } = touchesEdges;

        const padLeft = touchesLeft ? 0 : padding / 2;
        const padRight = touchesRight ? 0 : padding / 2;
        const padTop = touchesTop ? 0 : padding / 2;
        const padBottom = touchesBottom ? 0 : padding / 2;

        const paddedWidth = canvas.width + padLeft + padRight;
        const paddedHeight = canvas.height + padTop + padBottom;

        const paddedCanvas = document.createElement('canvas');
        paddedCanvas.width = paddedWidth;
        paddedCanvas.height = paddedHeight;
        const paddedCtx = paddedCanvas.getContext('2d');

        paddedCtx.clearRect(0, 0, paddedWidth, paddedHeight);
        paddedCtx.drawImage(canvas, padLeft, padTop, canvas.width, canvas.height);

        return paddedCanvas;
    }


    _addMargin(canvas, margin, blurMask) {
        if (margin <= 0) return canvas;

        const effectiveMargin = Math.max(margin, blurMask * 2);
        const marginWidth = canvas.width + effectiveMargin;
        const marginHeight = canvas.height + effectiveMargin;

        const marginCanvas = document.createElement('canvas');
        marginCanvas.width = marginWidth;
        marginCanvas.height = marginHeight;
        const marginCtx = marginCanvas.getContext('2d');

        marginCtx.clearRect(0, 0, marginWidth, marginHeight);
        const marginOffsetX = effectiveMargin / 2;
        const marginOffsetY = effectiveMargin / 2;
        marginCtx.drawImage(canvas, marginOffsetX, marginOffsetY, canvas.width, canvas.height);

        return marginCanvas;
    }

    _resizeCanvas(canvas, targetWidth, targetHeight, keepProportion) {
        if (!this.config.resizeMask) return canvas;

        if (keepProportion) {
            const aspectRatio = canvas.width / canvas.height;
            if (targetWidth / targetHeight > aspectRatio) {
                targetWidth = Math.round(targetHeight * aspectRatio);
            } else {
                targetHeight = Math.round(targetWidth / aspectRatio);
            }
        }

        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = targetWidth;
        resizedCanvas.height = targetHeight;
        const resizedCtx = resizedCanvas.getContext('2d');
        resizedCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

        return resizedCanvas;
    }

    _convertToBlackAndWhite(canvas) {
        const ctx = canvas.getContext('2d');
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
        const blurredCtx = blurredCanvas.getContext('2d');

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
            // alert('Selected mask is completely transparent.');
            
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


    exportCroppedMask(overrides = {}) {
        const config = { ...this.config, ...overrides };

        if (!this.plugin.currentMask) {
            // alert('No mask selected to export.');
            return null;
        }

        try {
            const maskCanvas = this.plugin.currentMask.canvasEl;
            const boundingBox = this._processBoundingBox(maskCanvas);
            if (!boundingBox) return null;

            const { minX, minY, maxX, maxY, touchesEdges } = boundingBox;
            let croppedWidth = maxX - minX + 1;
            let croppedHeight = maxY - minY + 1;
            const originalCroppedWidth = croppedWidth;
            const originalCroppedHeight = croppedHeight;

            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = croppedWidth;
            croppedCanvas.height = croppedHeight;
            const croppedCtx = croppedCanvas.getContext('2d');
            croppedCtx.drawImage(maskCanvas, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);

            if (config.padding > 0) {
                const paddedCanvas = this._addPadding(croppedCanvas, config.padding, touchesEdges);
                croppedWidth = paddedCanvas.width;
                croppedHeight = paddedCanvas.height;
                croppedCanvas.width = paddedCanvas.width;
                croppedCanvas.height = paddedCanvas.height;
                croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height);
                croppedCtx.drawImage(paddedCanvas, 0, 0);
            }

            if (config.margin > 0) {
                const marginCanvas = this._addMargin(croppedCanvas, config.margin, config.blurMask);
                croppedWidth = marginCanvas.width;
                croppedHeight = marginCanvas.height;
                croppedCanvas.width = marginCanvas.width;
                croppedCanvas.height = marginCanvas.height;
                croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height);
                croppedCtx.drawImage(marginCanvas, 0, 0);
            }

            if (config.resizeMask) {
                const resizedCanvas = this._resizeCanvas(croppedCanvas, config.resizeWidth, config.resizeHeight, config.resizeKeepProportion);
                croppedWidth = resizedCanvas.width;
                croppedHeight = resizedCanvas.height;
                croppedCanvas.width = resizedCanvas.width;
                croppedCanvas.height = resizedCanvas.height;
                croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height);
                croppedCtx.drawImage(resizedCanvas, 0, 0);
            }

            if (config.bw) {
                this._convertToBlackAndWhite(croppedCanvas);
            }

            if (config.blurMask > 0) {
                const blurredCanvas = this._applyBlur(croppedCanvas, config.blurMask);
                croppedCanvas.width = blurredCanvas.width;
                croppedCanvas.height = blurredCanvas.height;
                croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height);
                croppedCtx.drawImage(blurredCanvas, 0, 0);
            }

            const croppedImage = {
                loadedImage: {
                    width: this.plugin.imageOriginalWidth,
                    height: this.plugin.imageOriginalHeight
                },
                mask: {
                    x: minX,
                    y: minY,
                    width: originalCroppedWidth,
                    height: originalCroppedHeight,
                    resizePaddingWidth: croppedWidth,
                    resizePaddingHeight: croppedHeight
                },
            };
            store.dispatch({
                type: 'SET_CROPPED_IMAGE',
                payload: croppedImage
            });

            return croppedCanvas.toDataURL('image/png');

        } catch (error) {
            console.error('Error exporting cropped mask:', error);
            alert('An error occurred while exporting the cropped mask.');
            return null;
        }
    }


    saveCroppedMask(overrides = {}) {
        const config = { ...this.config, ...overrides };
        const dataURL = this.exportCroppedMask(overrides);
        if (dataURL) {
            const filenameParts = [`${this.plugin.currentMask.name}_cropped`];
            if (config.padding > 0) {
                filenameParts.push(`padded_${config.padding}`);
            }
            if (config.margin > 0) {
                filenameParts.push(`margin_${config.margin}`);
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
            this.downloadImage(dataURL, filename);
        }
    }


    exportCroppedImage(overrides = {}) {
        const config = { 
            padding: 0, 
            resizeMask: true, 
            resizeWidth: 1024, 
            resizeHeight: 1024, 
            resizeKeepProportion: true,
            ...overrides 
        };

        if (!this.plugin.imageObject) {
            alert('No image loaded to export.');
            return null;
        }

        if (!this.plugin.currentMask) {
            alert('No mask selected to guide the cropping.');
            return null;
        }

        try {
            const imageCanvas = document.createElement('canvas');
            const imageCtx = imageCanvas.getContext('2d');
            imageCanvas.width = this.plugin.imageOriginalWidth;
            imageCanvas.height = this.plugin.imageOriginalHeight;
            imageCtx.drawImage(
                this.plugin.imageObject.getElement(),
                0,
                0,
                imageCanvas.width,
                imageCanvas.height
            );

            const maskCanvas = this.plugin.currentMask.canvasEl;
            const boundingBox = this._processBoundingBox(maskCanvas);
            if (!boundingBox) return null;

            const { minX, minY, maxX, maxY } = boundingBox;
            let croppedWidth = maxX - minX + 1;
            let croppedHeight = maxY - minY + 1;

            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = croppedWidth;
            croppedCanvas.height = croppedHeight;
            const croppedCtx = croppedCanvas.getContext('2d');
            croppedCtx.drawImage(
                imageCanvas,
                minX,
                minY,
                croppedWidth,
                croppedHeight,
                0,
                0,
                croppedWidth,
                croppedHeight
            );

            if (config.padding > 0) {
                const paddedCanvas = document.createElement('canvas');
                paddedCanvas.width = croppedWidth + config.padding;
                paddedCanvas.height = croppedHeight + config.padding;
                const paddedCtx = paddedCanvas.getContext('2d');

                paddedCtx.clearRect(0, 0, paddedCanvas.width, paddedCanvas.height);
                const offsetX = config.padding / 2;
                const offsetY = config.padding / 2;
                paddedCtx.drawImage(
                    croppedCanvas,
                    offsetX,
                    offsetY,
                    croppedWidth,
                    croppedHeight
                );

                croppedCanvas.width = paddedCanvas.width;
                croppedCanvas.height = paddedCanvas.height;
                croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height);
                croppedCtx.drawImage(paddedCanvas, 0, 0);
                croppedWidth = paddedCanvas.width;
                croppedHeight = paddedCanvas.height;
            }

            if (config.resizeMask) {
                const resizedCanvas = this._resizeCanvas(croppedCanvas, config.resizeWidth, config.resizeHeight, config.resizeKeepProportion);
                croppedCanvas.width = resizedCanvas.width;
                croppedCanvas.height = resizedCanvas.height;
                croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height);
                croppedCtx.drawImage(resizedCanvas, 0, 0);
                croppedWidth = resizedCanvas.width;
                croppedHeight = resizedCanvas.height;
            }

            return croppedCanvas.toDataURL('image/png');

        } catch (error) {
            console.error('Error exporting cropped image:', error);
            alert('An error occurred while exporting the cropped image.');
            return null;
        }
    }

    saveCroppedImage(overrides = {}) {
        const config = { 
            padding: 0, 
            resizeMask: true, 
            resizeWidth: 1024, 
            resizeHeight: 1024, 
            resizeKeepProportion: true,
            ...overrides 
        };
        const dataURL = this.exportCroppedImage(overrides);
        if (dataURL) {
            const filenameParts = [`${this.plugin.imageObject.name}_cropped`];
            if (config.padding > 0) {
                filenameParts.push(`padded_${config.padding}`);
            }
            if (config.resizeMask) {
                const proportion = config.resizeKeepProportion ? '_proportional' : '';
                filenameParts.push(`resized_${config.resizeWidth}x${config.resizeHeight}${proportion}`);
            }
            const filename = `${filenameParts.join('_')}.png`;
            this.downloadImage(dataURL, filename);
        }
    }

    exportCroppedAlphaOnImage(overrides = {}) {
        const config = { 
            padding: 50, 
            resizeMask: true, 
            resizeWidth: 1024, 
            resizeHeight: 1024, 
            resizeKeepProportion: true, 
            blurMask: 25,
            ...overrides 
        };

        if (!this.plugin.imageObject) {
            alert('No image loaded to export.');
            return null;
        }

        if (!this.plugin.currentMask) {
            alert('No mask selected to guide the cropping.');
            return null;
        }

        try {
            const imageCanvas = document.createElement('canvas');
            const imageCtx = imageCanvas.getContext('2d');
            imageCanvas.width = this.plugin.imageOriginalWidth;
            imageCanvas.height = this.plugin.imageOriginalHeight;
            imageCtx.drawImage(
                this.plugin.imageObject.getElement(),
                0,
                0,
                imageCanvas.width,
                imageCanvas.height
            );

            const maskCanvas = this.plugin.currentMask.canvasEl;
            const boundingBox = this._processBoundingBox(maskCanvas);
            if (!boundingBox) return null;

            const { minX, minY, maxX, maxY } = boundingBox;
            const originalCroppedWidth = maxX - minX + 1;
            const originalCroppedHeight = maxY - minY + 1;

            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = originalCroppedWidth;
            croppedCanvas.height = originalCroppedHeight;
            const croppedCtx = croppedCanvas.getContext('2d');
            croppedCtx.drawImage(
                imageCanvas,
                minX,
                minY,
                originalCroppedWidth,
                originalCroppedHeight,
                0,
                0,
                originalCroppedWidth,
                originalCroppedHeight
            );

            if (config.padding > 0) {
                const paddedCanvas = document.createElement('canvas');
                paddedCanvas.width = originalCroppedWidth + config.padding;
                paddedCanvas.height = originalCroppedHeight + config.padding;
                const paddedCtx = paddedCanvas.getContext('2d');

                paddedCtx.clearRect(0, 0, paddedCanvas.width, paddedCanvas.height);
                const offsetX = config.padding / 2;
                const offsetY = config.padding / 2;
                paddedCtx.drawImage(
                    croppedCanvas,
                    offsetX,
                    offsetY,
                    originalCroppedWidth,
                    originalCroppedHeight
                );

                croppedCanvas.width = paddedCanvas.width;
                croppedCanvas.height = paddedCanvas.height;
                croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height);
                croppedCtx.drawImage(paddedCanvas, 0, 0);
            }

            const scaleXOriginal = croppedCanvas.width;
            const scaleYOriginal = croppedCanvas.height;

            if (config.resizeMask) {
                const resizedCanvas = this._resizeCanvas(croppedCanvas, config.resizeWidth, config.resizeHeight, config.resizeKeepProportion);
                croppedCanvas.width = resizedCanvas.width;
                croppedCanvas.height = resizedCanvas.height;
                croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height);
                croppedCtx.drawImage(resizedCanvas, 0, 0);
            }

            const tempMaskCanvas = document.createElement('canvas');
            tempMaskCanvas.width = croppedCanvas.width;
            tempMaskCanvas.height = croppedCanvas.height;
            const tempMaskCtx = tempMaskCanvas.getContext('2d');
            tempMaskCtx.drawImage(
                maskCanvas,
                minX,
                minY,
                originalCroppedWidth,
                originalCroppedHeight,
                0,
                0,
                croppedCanvas.width,
                croppedCanvas.height
            );

            const tempMaskImageData = tempMaskCtx.getImageData(0, 0, croppedCanvas.width, croppedCanvas.height);
            const tempMaskData = tempMaskImageData.data;

            const croppedImageData = croppedCtx.getImageData(0, 0, croppedCanvas.width, croppedCanvas.height);
            const croppedData = croppedImageData.data;

            for (let i = 0; i < croppedData.length; i += 4) {
                const maskAlpha = tempMaskData[i + 3];
                // Invert the alpha: 255 - maskAlpha
                croppedData[i + 3] = 255 - maskAlpha;
            }

            croppedCtx.putImageData(croppedImageData, 0, 0);

            if (config.blurMask > 0) {
                const blurredCanvas = this._applyBlur(croppedCanvas, config.blurMask);
                croppedCanvas.width = blurredCanvas.width;
                croppedCanvas.height = blurredCanvas.height;
                croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height);
                croppedCtx.drawImage(blurredCanvas, 0, 0);
            }

            const finalCroppedWidth = croppedCanvas.width;
            const finalCroppedHeight = croppedCanvas.height;
            const croppedImage = {
                loadedImage: {
                    width: imageCanvas.width,
                    height: imageCanvas.height
                },
                mask: {
                    x: minX,
                    y: minY,
                    width: originalCroppedWidth,
                    height: originalCroppedHeight,
                    resizePaddingWidth: finalCroppedWidth,
                    resizePaddingHeight: finalCroppedHeight
                },
            };
            store.dispatch({
                type: 'SET_CROPPED_IMAGE',
                payload: croppedImage
            });

            return croppedCanvas.toDataURL('image/png');

        } catch (error) {
            console.error('Error exporting cropped alpha on image:', error);
            alert('An error occurred while exporting the cropped alpha on image.');
            return null;
        }
    }

    saveCroppedAlphaOnImage(overrides = {}) {
        const config = { 
            padding: 50, 
            resizeMask: true, 
            resizeWidth: 1024, 
            resizeHeight: 1024, 
            resizeKeepProportion: true, 
            blurMask: 25,
            ...overrides 
        };
        const dataURL = this.exportCroppedAlphaOnImage(overrides);
        if (dataURL) {
            const filenameParts = [`${this.plugin.imageObject.name}_cropped_alpha_on_image`];
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
            const filename = `${filenameParts.join('_')}.png`;
            this.downloadImage(dataURL, filename);
        }
    }

    createCombinedAlphaMask() {
        const alphaCanvas = document.createElement('canvas');
        alphaCanvas.width = this.plugin.imageOriginalWidth;
        alphaCanvas.height = this.plugin.imageOriginalHeight;
        const alphaCtx = alphaCanvas.getContext('2d');

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
            const combinedCtx = combinedCanvas.getContext('2d');

            combinedCtx.drawImage(this.plugin.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);

            const alphaMask = document.createElement('canvas');
            alphaMask.width = this.plugin.imageOriginalWidth;
            alphaMask.height = this.plugin.imageOriginalHeight;
            const alphaCtx = alphaMask.getContext('2d');
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
                const combinedCtx = combinedCanvas.getContext('2d');

                combinedCtx.drawImage(this.plugin.imageObject.getElement(), 0, 0, combinedCanvas.width, combinedCanvas.height);

                const alphaMask = document.createElement('canvas');
                alphaMask.width = this.plugin.imageOriginalWidth;
                alphaMask.height = this.plugin.imageOriginalHeight;
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
            const combinedCtx = combinedCanvas.getContext('2d');

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
            const combinedCtx = combinedCanvas.getContext('2d');

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
            const combinedCtx = combinedCanvas.getContext('2d');

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
            const combinedCtx = combinedCanvas.getContext('2d');

            combinedCtx.fillStyle = 'black';
            combinedCtx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

            this.plugin.masks.forEach(mask => {
                const maskCanvas = document.createElement('canvas');
                maskCanvas.width = this.plugin.imageOriginalWidth;
                maskCanvas.height = this.plugin.imageOriginalHeight;
                const maskCtx = maskCanvas.getContext('2d');

                maskCtx.drawImage(mask.canvasEl, 0, 0, maskCanvas.width, maskCanvas.height);

                const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i + 3];
                    if (alpha > 0) {
                        data[i] = 255;     // Red
                        data[i + 1] = 255; // Green
                        data[i + 2] = 255; // Blue
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
            const combinedCtx = combinedCanvas.getContext('2d');

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
