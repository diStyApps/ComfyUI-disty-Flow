import { CanvasManager } from './CanvasManager.js';
import { ImageLoaderPlugin } from './ImageLoaderPlugin.js';
import { ImageCompareSliderPlugin } from './ImageCompareSliderPlugin.js';
import { MaskBrushPlugin } from './MaskBrushPlugin.js';
import { CanvasControlsPlugin } from './CanvasControlsPlugin.js';
import { CustomBrushPlugin } from './CustomBrushPlugin.js';
import { UndoRedoPlugin } from './UndoRedoPlugin.js';
import { ImageAdderPlugin } from './ImageAdderPlugin.js';
import { CanvasScaleForSavePlugin } from './CanvasScaleForSavePlugin.js';
import { store } from '../../scripts/stateManagerMain.js';

const loadScript = (src, name = '') => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.onload = () => {
            // console.log(`${name || src} loaded successfully`);
            resolve();
        };
        script.onerror = () => {
            const error = `Failed to load ${name || src}`;
            console.error(error);
            reject(new Error(error));
        };
        document.head.appendChild(script);
    });
};

const loadDependencies = async () => {
    try {
        await Promise.all([
            loadScript('/core/js/common/components/canvas/fabric.5.2.4.min.js', 'Fabric.js'),
            // loadScript('/core/js/common/components/canvas/pica.min.js', 'Pica.js')
        ]);
        // console.log('All dependencies loaded successfully');
    } catch (error) {
        console.error('Failed to load dependencies:', error);
    }
};

function setView(view) {
    const canvasWrapper = document.getElementById("canvasWrapper");
    const imageContainer = document.getElementById("image-container");

    if (!canvasWrapper || !imageContainer) {
        console.warn("Required elements not found: 'canvasWrapper' or 'image-container'.");
        return;
    }

    switch(view) {
        case 'output':
            imageContainer.style.display = "flex"; 
            canvasWrapper.style.display = "none"; 
            break;
        case 'canvas':
            canvasWrapper.style.display = "flex"; 
            imageContainer.style.display = "none";
            break;
        case 'splitView':
            canvasWrapper.style.display = "flex";
            imageContainer.style.display = "flex";
            break;
        default:
            console.warn(`Unknown view state: ${view}. Defaulting to 'splitView'.`);
            canvasWrapper.style.display = "flex";
            imageContainer.style.display = "flex";
    }
}


export class CanvasLoader {
    constructor(canvasId, flowConfig) {
        this.canvasId = canvasId;
        this.flowConfig = flowConfig;
        this.isInitialized = false;
        this.initPromise = this.init();

        store.subscribe((state) => {
            setView(state.view);
        });

        setView(this.flowConfig.initialView || store.getState().view);
    }

    determineCanvasOptions(flowConfig) {
        const options = {
            canvasControls: true,
            imageLoader: false, 
            undo: true,           
            maskBrush: false,     
            customBrush: false,
            imageCompareSlider: false,
            imageAdder: false,
            canvasScaleForSave: false,
        };

        // **Case 1**: Load maskBrush if canvasLoadedImages and canvasSelectedMaskOutputs are present
        if (flowConfig.canvasLoadedImages && Array.isArray(flowConfig.canvasLoadedImages) && flowConfig.canvasLoadedImages.length > 0 &&
            flowConfig.canvasAlphaOutputs && Array.isArray(flowConfig.canvasAlphaOutputs) && flowConfig.canvasAlphaOutputs.length > 0) {
            options.maskBrush = true;
            options.imageLoader = true;
            store.dispatch({
                type: 'SET_VIEW',
                payload: 'canvas'
            });
            store.dispatch({
                type: 'SET_INPAINT_STYLE',
                payload: 'full'
            });
        }

        // **Case 2**: Load customBrush if canvasOutputs are present
        if (flowConfig.canvasOutputs && Array.isArray(flowConfig.canvasOutputs) && flowConfig.canvasOutputs.length > 0) {
            options.customBrush = true;
            options.imageLoader = true;
            options.canvasScaleForSave = true;
            store.dispatch({
                type: 'SET_VIEW',
                payload: 'splitView'
            });
        }
        // // **Case 3**: Load canvasCroppedImageOutputs if canvasCroppedMaskOutputs are present
        // if (flowConfig.canvasCroppedMaskOutputs && Array.isArray(flowConfig.canvasCroppedMaskOutputs) && flowConfig.canvasCroppedMaskOutputs.length > 0) {
        //     options.maskBrush = true;
        //     options.imageLoader = true;
        //     store.dispatch({
        //         type: 'SET_VIEW',
        //         payload: 'canvas'
        //     });
        // }

        //MASK
        // **Case 4**: Load canvasCroppedImageOutputs and canvasCroppedMaskOutputs and canvasLoadedImages are present
        if (flowConfig.canvasCroppedImageOutputs && Array.isArray(flowConfig.canvasCroppedImageOutputs) && flowConfig.canvasCroppedImageOutputs.length > 0 &&
            flowConfig.canvasCroppedMaskOutputs && Array.isArray(flowConfig.canvasCroppedMaskOutputs) && flowConfig.canvasCroppedMaskOutputs.length > 0 &&
            flowConfig.canvasLoadedImages && Array.isArray(flowConfig.canvasLoadedImages) && flowConfig.canvasLoadedImages.length > 0) {
                options.maskBrush = true;
                options.imageLoader = true;
                store.dispatch({
                    type: 'SET_VIEW',
                    payload: 'canvas'
                });
                store.dispatch({
                    type: 'SET_INPAINT_STYLE',
                    payload: 'cropped'
                });
                
        }
        //ALPHA MASK
        // **Case 5**: Load canvasCroppedImageOutputs and canvasCroppedAlphaOnImageOutputs and canvasLoadedImages are present
        if (flowConfig.canvasCroppedImageOutputs && Array.isArray(flowConfig.canvasCroppedImageOutputs) && flowConfig.canvasCroppedImageOutputs.length > 0 &&
            flowConfig.canvasCroppedAlphaOnImageOutputs && Array.isArray(flowConfig.canvasCroppedAlphaOnImageOutputs) && flowConfig.canvasCroppedAlphaOnImageOutputs.length > 0 &&
            flowConfig.canvasLoadedImages && Array.isArray(flowConfig.canvasLoadedImages) && flowConfig.canvasLoadedImages.length > 0) {
                options.maskBrush = true;
                options.imageLoader = true;
                store.dispatch({
                    type: 'SET_VIEW',
                    payload: 'canvas'
                });
                store.dispatch({
                    type: 'SET_INPAINT_STYLE',
                    payload: 'cropped'
                });
        }
        return options;
    }

    async init() {
        try {
            this.options = this.determineCanvasOptions(this.flowConfig);


            if (!this.options.maskBrush && !this.options.customBrush) {
                console.log("No relevant fields in flowConfig. Canvas will not be displayed or initialized.");
                this.hideCanvasUI();
                return;
            }

            // await loadFabric();
            // loadScript('/core/js/common/components/canvas/fabric.5.2.4.min.js')
            await loadDependencies();
            const canvasWrapper = document.getElementById('canvasWrapper');
            const pluginUIContainer = document.getElementById('pluginUIContainer');

            if (!canvasWrapper || !pluginUIContainer) {
                throw new Error('Required DOM elements (canvasWrapper or pluginUIContainer) are missing.');
            }

            canvasWrapper.style.display = 'block';
            pluginUIContainer.style.display = 'flex';

            this.canvasManager = new CanvasManager({ canvasId: this.canvasId });

            if (this.options.imageLoader) {
                const imageLoaderPlugin = new ImageLoaderPlugin({
                    mode: 'Single' // Set to 'Single' or 'Multi' as needed
                });
                this.canvasManager.registerPlugin(imageLoaderPlugin);
            }

            if (this.options.canvasControls) {
                const canvasControlsPlugin = new CanvasControlsPlugin();
                this.canvasManager.registerPlugin(canvasControlsPlugin);
            }

            if (this.options.undo) {
                const undoRedoPlugin = new UndoRedoPlugin({
                    maxHistory: 100,
                });
                this.canvasManager.registerPlugin(undoRedoPlugin);
            }
            if (this.options.canvasScaleForSave) {
                const canvasScaleForSave = new CanvasScaleForSavePlugin({
                    defaultScale: 1,
                    showDownloadButton: true,
                });
                this.canvasManager.registerPlugin(canvasScaleForSave);
            }
            if (this.options.maskBrush) {
                const maskBrushPlugin = new MaskBrushPlugin({
                    brushSize: 75,
                    brushOpacity: 0.5,
                    cursorOutlineType: 'dashed',
                    cursorPrimaryColor: '#000000',
                    cursorSecondaryColor: '#FFFFFF',
                    cursorLineWidth: 1,
                    cursorFill: true,
                    useBrushColorPrimaryColor: true,
                    brushColor: '#FF0000',
                    useBrushColorForCursorRing: false,
                });
                this.canvasManager.registerPlugin(maskBrushPlugin);
            }

            if (this.options.customBrush) {
                const customBrushPlugin = new CustomBrushPlugin({
                    brushSize: 25,
                    brushOpacity: 1,
                    cursorOutlineType: 'dotted',
                    cursorPrimaryColor: '#000000',
                    cursorSecondaryColor: '#FFFFFF',
                    cursorLineWidth: 1,
                    cursorFill: true,
                    useBrushColorPrimaryColor: true,
                    brushColor: '#64D813',
                    useBrushColorForCursorRing: false,
                });
                this.canvasManager.registerPlugin(customBrushPlugin);
            }

            if (this.options.imageCompareSlider) {
                const imageCompareSliderPlugin = new ImageCompareSliderPlugin({
                    sliderColor: '#570d7b',
                    sliderWidth: 2,
                    handleRadius: 18,
                    handleStrokeWidth: 4,
                    handleStrokeColor: '#fff',
                    topMargin: 23,
                    bottomMargin: 23,
                    mode: 'Pairs' // 'Pairs', 'Replace', or 'Multi'
                });
                this.canvasManager.registerPlugin(imageCompareSliderPlugin);
            }

            if (this.options.imageAdder) {
                const imageAdderPlugin = new ImageAdderPlugin();
                this.canvasManager.registerPlugin(imageAdderPlugin);
            }

            console.log('All selected plugins registered successfully');

            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing CanvasLoader:', error);
            this.hideCanvasUI();
        }
    }

    hideCanvasUI() {
        const canvasWrapper = document.getElementById('canvasWrapper');
        const pluginUIContainer = document.getElementById('pluginUIContainer');

        if (canvasWrapper) {
            canvasWrapper.style.display = 'none';
        }

        if (pluginUIContainer) {
            pluginUIContainer.style.display = 'none';
        }
    }

    getOriginalImage(id) {
        const imageLoaderPlugin = this.canvasManager.getPluginByName('ImageLoaderPlugin');
        if (imageLoaderPlugin && imageLoaderPlugin.getOriginalImage) {
            return imageLoaderPlugin.getOriginalImage(id);
        } else {
            console.error('ImageLoaderPlugin is not registered or does not have getOriginalImage.');
            return null;
        }
    }

    getMaskImage() {
        const maskBrushPlugin = this.canvasManager.getPluginByName('MaskBrushPlugin');
        if (maskBrushPlugin) {
            const exportFunction = maskBrushPlugin.getExportFunction('saveAllMasksCombined');
            if (exportFunction) {
                return exportFunction();
            } else {
                console.error('Failed to get export function for saveMaskAlphaOnImage.');
                return null;
            }
        }
        return null;
    }

    getMaskAlphaOnImage() {
        const maskBrushPlugin = this.canvasManager.getPluginByName('MaskBrushPlugin');
        if (maskBrushPlugin) {
            const exportFunction = maskBrushPlugin.getExportFunction('saveAllMasksCombinedAlphaOnImage');
            if (exportFunction) {
                return exportFunction();
            } else {
                console.error('Failed to get export function for saveMaskAlphaOnImage.');
                return null;
            }
        }
        return null;
    }

    getCroppedMask(){
        const maskBrushPlugin = this.canvasManager.getPluginByName('MaskBrushPlugin');
        if (maskBrushPlugin) {
            const exportFunction = maskBrushPlugin.getExportFunction('saveCroppedMask');
            if (exportFunction) {
                return exportFunction();
            } else {
                console.error('Failed to get export function for saveCroppedMask.');
                return null;
            }
        }
        return null;
    }

    getCroppedImage(){
        const maskBrushPlugin = this.canvasManager.getPluginByName('MaskBrushPlugin');
        if (maskBrushPlugin) {
            const exportFunction = maskBrushPlugin.getExportFunction('saveCroppedImage');
            if (exportFunction) {
                return exportFunction();
            } else {
                console.error('Failed to get export function for saveCroppedImage.');
                return null;
            }
        }
        return null;
    }

    getCroppedAlphaOnImage(){
        const maskBrushPlugin = this.canvasManager.getPluginByName('MaskBrushPlugin');
        if (maskBrushPlugin) {
            const exportFunction = maskBrushPlugin.getExportFunction('saveCroppedAlphaOnImage');
            if (exportFunction) {
                return exportFunction();
            } else {
                console.error('Failed to get export function for saveCroppedAlphaOnImage.');
                return null;
            }
        }
        return null;
    }

    getSelectedMaskAlphaOnImage() {
        const maskBrushPlugin = this.canvasManager.getPluginByName('MaskBrushPlugin');
        if (maskBrushPlugin) {
            const selectedOption = maskBrushPlugin.saveOptionsSelect.value;
            const exportFunction = maskBrushPlugin.getExportFunction(selectedOption);
            if (exportFunction) {
                return exportFunction();
            } else {
                console.error('Unknown save option selected in MaskBrushPlugin.');
                return null;
            }
        } 
    }

    getCanvasOutImage() {
        return this.getCanvasImage();
    }

    getCanvasImage() {
        if (this.canvasManager && this.canvasManager.getCanvasImage) {
            return this.canvasManager.getCanvasImage();
        } else {
            console.error('CanvasManager is not initialized or getCanvasImage method is unavailable.');
            return null;
        }
    }  

}
