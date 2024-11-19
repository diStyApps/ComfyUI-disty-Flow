import { CanvasManager } from './CanvasManager.js';
import { ImageLoaderPlugin } from './ImageLoaderPlugin.js';
import { ImageCompareSliderPlugin } from './ImageCompareSliderPlugin.js';
import { MaskBrushPlugin } from './MaskBrushPlugin.js';
import { CanvasControlsPlugin } from './CanvasControlsPlugin.js';
import { CustomBrushPlugin } from './CustomBrushPlugin.js';
import { UndoRedoPlugin } from './UndoRedoPlugin.js';
import { ImageAdderPlugin } from './ImageAdderPlugin.js';
import { CanvasScaleForSavePlugin } from './CanvasScaleForSavePlugin.js';

const loadFabric = () => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/core/js/common/components/canvas/fabric.5.2.4.min.js';
        script.async = false;
        script.onload = () => {
            console.log('Fabric.js loaded successfully');
            resolve();
        };
        script.onerror = () => {
            console.error('Failed to load Fabric.js');
            reject(new Error('Fabric.js failed to load'));
        };
        document.head.appendChild(script);
    });
};

// Floating toolbar functionality - move
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    .plugin-ui-container {
        position: relative;
        display: flex;
        gap: 0.5rem;
        padding: 0.5rem;
        padding-right: calc(0.5rem + 36px);
        transition: background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
        will-change: transform;
    }

    .plugin-ui-container.floating {
        position: fixed;
        bottom: 25%;
       /* left: 16%px; */
        z-index: 1000;
        background: var(--color-background);
        border: 1px dashed var(--color-border);
        cursor: move;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .dock-toggle {
        position: absolute;
        right: 0;
        top: 0;
        height: 100%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem;
        background: var(--color-button-primary);
        border: none;
        border-left: 1px dashed var(--color-border);
        cursor: pointer;
        transition: all 0.2s;
        color: var(--color-primary-text);
        width: 36px;
    }

    .plugin-ui-container.floating .dock-toggle {
        position: relative;
        height: 36px;
        margin-left: 0.5rem;
        border: none;
    }

    .dock-toggle:hover {
        background: var(--color-button-primary-hover);
    }

    .dock-toggle svg {
        width: 1.25rem;
        height: 1.25rem;
        transition: transform 0.2s ease;
    }

    .dock-toggle:hover svg {
        transform: scale(1.1);
    }

    .plugin-ui-container.floating .dock-toggle:hover svg {
        transform: scale(1.1);
    }
`;
document.head.appendChild(styleSheet);

function initializeFloating() {
    const container = document.getElementById('pluginUIContainer');
    const dockButton = document.createElement('button');
    dockButton.className = 'dock-toggle';
    dockButton.title = 'Make toolbar floating';
    dockButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                  d="M15 9l-3-3m0 0L9 9m3-3v15m0-15h6m-6 0H6"/>
        </svg>
    `;
    container.appendChild(dockButton);

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    let originalPosition = null;
    let lastFrameTime = 0;
    const frameRate = 1000 / 120;

    function updateDockIcon(isFloating) {
        dockButton.title = isFloating ? 'Dock toolbar' : 'Make toolbar floating';
        dockButton.innerHTML = isFloating 
            ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                         d="M9 15l3 3m0 0l3-3m-3 3V6m0 12h6m-6 0H6"/>
               </svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                         d="M15 9l-3-3m0 0L9 9m3-3v15m0-15h6m-6 0H6"/>
               </svg>`;
    }

    function updateDockButtonPosition(isFloating) {
        if (isFloating) {
            container.appendChild(dockButton);
        } else {
            container.insertBefore(dockButton, container.firstChild);
        }
    }

    function startDragging(e) {
        if (container.classList.contains('floating') && e.target !== dockButton) {
            isDragging = true;
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            container.style.transition = 'none';
            document.body.style.cursor = 'move';
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            
            const currentTime = performance.now();
            if (currentTime - lastFrameTime < frameRate) return;
            
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            container.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
            
            lastFrameTime = currentTime;
        }
    }

    function stopDragging() {
        if (isDragging) {
            isDragging = false;
            container.style.transition = '';
            document.body.style.cursor = '';
        }
    }

    function toggleFloating() {
        const isFloating = container.classList.toggle('floating');
        updateDockIcon(isFloating);
        updateDockButtonPosition(isFloating);

        if (isFloating) {
            originalPosition = {
                parent: container.parentNode,
                nextSibling: container.nextSibling,
                styles: {
                    position: container.style.position,
                    top: container.style.top,
                    left: container.style.left,
                    transform: container.style.transform,
                    zIndex: container.style.zIndex
                }
            };
            
            container.addEventListener('mousedown', startDragging);
            window.addEventListener('mousemove', drag);
            window.addEventListener('mouseup', stopDragging);
            window.addEventListener('mouseleave', stopDragging);
            
            container.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
        } else {
            container.removeEventListener('mousedown', startDragging);
            window.removeEventListener('mousemove', drag);
            window.removeEventListener('mouseup', stopDragging);
            window.removeEventListener('mouseleave', stopDragging);
            
            container.style.transform = '';
            container.style.position = '';
            container.style.top = '';
            container.style.left = '';
            container.style.zIndex = '';
            xOffset = 0;
            yOffset = 0;
        }
    }

    dockButton.addEventListener('click', toggleFloating);

    container.addEventListener('selectstart', (e) => {
        if (isDragging) e.preventDefault();
    });

    return function cleanup() {
        container.removeEventListener('mousedown', startDragging);
        window.removeEventListener('mousemove', drag);
        window.removeEventListener('mouseup', stopDragging);
        window.removeEventListener('mouseleave', stopDragging);
        dockButton.removeEventListener('click', toggleFloating);
        container.removeEventListener('selectstart', (e) => {
            if (isDragging) e.preventDefault();
        });
        if (dockButton.parentNode) {
            dockButton.parentNode.removeChild(dockButton);
        }
    };
}
const cleanupFloating = initializeFloating();
// Floating toolbar functionality

export class CanvasLoader {
    constructor(canvasId, flowConfig) {
        this.canvasId = canvasId;
        this.flowConfig = flowConfig;
        this.isInitialized = false;
        this.initPromise = this.init();
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
            flowConfig.canvasSelectedMaskOutputs && Array.isArray(flowConfig.canvasSelectedMaskOutputs) && flowConfig.canvasSelectedMaskOutputs.length > 0) {
            options.maskBrush = true;
            options.imageLoader = true;
        }

        // **Case 2**: Load customBrush if canvasOutputs are present
        if (flowConfig.canvasOutputs && Array.isArray(flowConfig.canvasOutputs) && flowConfig.canvasOutputs.length > 0) {
            options.customBrush = true;
            options.imageLoader = true;
            options.canvasScaleForSave = true;


        }

        return options;
    }

    async init() {
        try {
            this.options = this.determineCanvasOptions(this.flowConfig);


            if (!this.options.maskBrush && !this.options.customBrush) {
                console.warn("No relevant fields in flowConfig. Canvas will not be displayed or initialized.");
                this.hideCanvasUI();
                return;
            }

            await loadFabric();

            const canvasWrapper = document.getElementById('canvasWrapper');
            const pluginUIContainer = document.getElementById('pluginUIContainer');

            if (!canvasWrapper || !pluginUIContainer) {
                throw new Error('Required DOM elements (canvasWrapper or pluginUIContainer) are missing.');
            }

            canvasWrapper.style.display = 'block';
            pluginUIContainer.style.display = 'block';

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
