export class CanvasPlugin {
    constructor(name) {
        this.name = name;
    }

    init(canvasManager) {
        throw new Error('init() must be implemented by the plugin.');
    }

    destroy() {
        throw new Error('destroy() must be implemented by the plugin.');
    }
}
