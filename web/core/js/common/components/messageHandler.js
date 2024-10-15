import { WebSocketHandler } from './webSocketHandler.js';
import { updateProgress, displayImagesInDiv } from './imagedisplay.js';
import { hideSpinner } from './utils.js';

export class MessageHandler {
    constructor() {
        this.lastImageFilenames = [];
        this.spinnerHidden = false;
        }

    handleMessage(event) {
        // console.log(event.data)
        try {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'progress':
                    this.handleProgress(data.data);
                    break;
                case 'crystools.monitor':
                    this.handleMonitor(data.data);
                    break;
                case 'executed':
                    this.handleExecuted(data.data);
                    break;
                case 'execution_interrupted':
                    this.handleInterrupted();
                    break;
                case 'status':
                    this.handleStatus();
                    break;
                case 'executing':
                    // hideSpinner();
                    break;       
                case 'execution_error':
                    hideSpinner();
                        break;                                    
                default:
                    console.log('Unhandled message type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            hideSpinner();
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
    }

    handleExecuted(data) {
        if ('images' in data.output) {
            const images = data.output.images;
            const newImageFilenames = [];
            const imageUrls = images.map(image => {
                const filename = image.filename;
                const subfolder = image.subfolder;
                
                if (this.lastImageFilenames.includes(filename)) {
                    console.log('Duplicate image:', filename);
                    return null;
                }
                
                newImageFilenames.push(filename);
                const rand = Math.random();
                console.log('Images:', `/view?filename=${filename}`);

                return `/view?filename=${filename}`;
            }).filter(url => url !== null);

            if (imageUrls.length > 0) {
                displayImagesInDiv(imageUrls);
                this.lastImageFilenames = newImageFilenames;
            }
        }

        if ('gifs' in data.output) {
            const videos = data.output.gifs;
            const videoUrls = videos.map(video => {
                const filename = video.filename;
                const subfolder = video.subfolder;
                const rand = Math.random();
                return `/view?filename=${filename}`;
            });
            console.log('Videos:', videoUrls);
            displayImagesInDiv(videoUrls);
        }
        
        hideSpinner();
    }

    handleInterrupted() {
        hideSpinner();
        console.log('Execution Interrupted');
    }

    handleStatus() {
        updateProgress();
    }
}

export function initializeWebSocket(clientId) {
    const server_address = `${window.location.hostname}:${window.location.port}`;

    const messageHandler = new MessageHandler();
    const wsHandler = new WebSocketHandler(
        `ws://${server_address}/ws?clientId=${clientId}`,
        (event) => messageHandler.handleMessage(event)
    );
    wsHandler.connect();
    return wsHandler;
}