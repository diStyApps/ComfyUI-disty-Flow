import { WebSocketHandler } from './webSocketHandler.js';
import './progressbar.js'; 
import { hideSpinner } from './utils.js';
import { store } from '../scripts/stateManagerMain.js';

import { JSONMessageProcessor } from './JSONMessageProcessor.js';
import { BlobMessageProcessor } from './BlobMessageProcessor.js';
import { PreviewManager } from './previewManager.js';

export class MessageHandler {
    constructor() {
        this.lastImageFilenames = [];
        this.spinnerHidden = false;
        this.jsonProcessor = new JSONMessageProcessor(this);
        this.blobProcessor = new BlobMessageProcessor(this);
        this.previewManager = new PreviewManager();
        this.progressUpdater = new window.ProgressUpdater('main-progress', 'progress-text');
    }

    setOriginalImage(dataURL) {
        this.previewManager.setOriginalImage(dataURL);
    }

    setAlphaMaskImage(dataURL) {
        this.previewManager.setAlphaMaskImage(dataURL);
    }

    setCanvasSelectedMaskOutputs(dataURL) {
        this.previewManager.setCanvasSelectedMaskOutputs(dataURL);
    }

    setCroppedMaskImage(dataURL) {
        this.previewManager.setCroppedMaskImage(dataURL);
    }

    setMaskImage(dataURL) {
        this.previewManager.setMaskImage(dataURL);
    }

    handlePreviewOutputMessage(event) {
        if (typeof event.data === 'string') {
            this.jsonProcessor.process(event.data);
        } else if (event.data instanceof Blob) {
            this.blobProcessor.process(event.data).then(result => {
                this.previewManager.handlePreviewOutput(result);
            });
        } else {
            console.warn('Unknown message type:', typeof event.data);
        }
    }

    handleProgress(data) {
        this.hideSpinnerOnce();
        this.updateProgress(data);
    }

    handleStatus() {
        // Optional additional handling
    }
    handleMonitor(data) {
        // console.log('Monitor data received:', data);
    }
    hideSpinnerOnce() {
        if (!this.spinnerHidden) {
            hideSpinner();
            this.spinnerHidden = true;
        }
    }

    handleExecuted(data) {
        if (data.output) {
            if ('images' in data.output) {
                this.processFinalImageOutput(data.output.images);
            }
            if ('gifs' in data.output) {
                this.processFinalVideoOutput(data.output.gifs);
            }
        }

        hideSpinner();
        const event = new CustomEvent('jobCompleted');
        window.dispatchEvent(event);
    }

    async processFinalImageOutput(images) {
        const newImageFilenames = [];
        const imageUrls = images.map(image => {
            const { filename } = image;
            if (filename.includes('ComfyUI_temp')) return null;
            if (this.lastImageFilenames.includes(filename)) return null;

            newImageFilenames.push(filename);
            const imageUrl = `/view?filename=${encodeURIComponent(filename)}`;
            console.log('processImages Image URL:', imageUrl);
            return imageUrl;
        }).filter(url => url !== null);

        if (imageUrls.length > 0) {
            this.previewManager.displayFinalMediaOutput(imageUrls);
            this.displayPreviewOutput(imageUrls);
            this.lastImageFilenames = newImageFilenames;
            return imageUrls;
        }
    }

    displayPreviewOutput(imageUrls) {
        for (const url of imageUrls) {
            try {
                const { viewType } = store.getState();
                if (viewType === 'canvasView') {
                    this.previewManager.setImageDataType('finalImageData');
                    this.previewManager.emitCombinedImage(url);
                }
            } catch (error) {
                console.error('Error overlaying preview on image:', url, error);
            }
        }
    }

    processFinalVideoOutput(videos) {
        const videosUrls = videos.map(video => {
            const { filename } = video;
            return `/view?filename=${encodeURIComponent(filename)}`;
        });

        this.previewManager.displayFinalMediaOutput(videosUrls); 
    }

    handleInterrupted() {
        hideSpinner();
        console.log('Execution Interrupted');
        const event = new CustomEvent('jobInterrupted');
        window.dispatchEvent(event);
    }

    updateProgress(data = {}) {
        this.progressUpdater.update(data);
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
