import { EventEmitter } from './EventEmitter.js';
import { CanvasPlugin } from './CanvasPlugin.js';

export class CanvasManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.canvasId = options.canvasId || 'imageCanvas';
        this.canvas = new fabric.Canvas(this.canvasId, {
            selection: false,
            defaultCursor: 'default',
            preserveObjectStacking: true
        });

        this.plugins = new Set();

        this.init();

        window.addEventListener('resize', this.resizeCanvas.bind(this));

        this.observeContainerResize();

        this.scaleMultiplier = 1; 

        this.on('canvas:scaleChanged', this.onScaleChanged.bind(this));
    }

    init() {
        this.resizeCanvas();
        this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    }

    resizeCanvas() {
        const container = document.getElementById('canvasWrapper');
        if (!container) {
            console.warn('canvasWrapper element not found in the DOM.');
            return;
        }

        const { clientWidth, clientHeight } = container;

        this.canvas.setWidth(clientWidth);
        this.canvas.setHeight(clientHeight);

        this.canvas.renderAll();

        this.emit('canvas:resized', { width: clientWidth, height: clientHeight });
    }

    observeContainerResize() {
        const container = document.getElementById('canvasWrapper');
        if (!container || typeof ResizeObserver === 'undefined') return;

        const resizeObserver = new ResizeObserver(() => {
            this.resizeCanvas();
        });

        resizeObserver.observe(container);
    }

    registerPlugin(plugin) {
        if (!(plugin instanceof CanvasPlugin)) {
            throw new Error('Plugin must extend the CanvasPlugin class.');
        }
        plugin.init(this);
        this.plugins.add(plugin);
        console.log(`CanvasManager: Registered plugin ${plugin.name}`);
    }

    unregisterPlugin(plugin) {
        if (this.plugins.has(plugin)) {
            plugin.destroy();
            this.plugins.delete(plugin);
            console.log(`CanvasManager: Unregistered plugin ${plugin.name}`);
        }
    }

    getCanvasImage() {
        return this.canvas.toDataURL({
            format: 'png',
            multiplier: this.scaleMultiplier
        });
    }

    getPluginByName(name) {
        for (let plugin of this.plugins) {
            if (plugin.name === name) {
                return plugin;
            }
        }
        return null;
    }

    onHandleSave() {
        const maskBrushPlugin = this.getPluginByName('MaskBrushPlugin');
        if (maskBrushPlugin) {
            const selectedOption = maskBrushPlugin.saveOptionsSelect.value;
            this.emit('save:trigger', selectedOption);
        } else {
            console.error('MaskBrushPlugin is not registered. Cannot handle save.');
        }
    }

    onScaleChanged(data) {
        this.scaleMultiplier = data.scale;
        console.log(`CanvasManager: Scale multiplier set to ${this.scaleMultiplier}`);
    }

    destroy() {
        window.removeEventListener('resize', this.resizeCanvas.bind(this));

        this.plugins.forEach(plugin => plugin.destroy());
        this.plugins.clear();

        this.canvas.dispose();
        console.log('CanvasManager destroyed');
    }
}
