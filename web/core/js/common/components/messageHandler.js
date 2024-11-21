import { WebSocketHandler } from './webSocketHandler.js';
import { updateProgress, displayImagesInDiv } from './imagedisplay.js';
import { hideSpinner } from './utils.js';

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
            if (!blob.type) {
                const headerSize = 8; 
                if (blob.size <= headerSize) {
                    console.error('Blob size is too small to contain valid image data.');
                    hideSpinner();
                    return;
                }

                const slicedBlob = blob.slice(headerSize);
                const detectedType = await detectMimeType(slicedBlob);
                if (detectedType) {
                    this.messageHandler.handleMedia(URL.createObjectURL(slicedBlob), detectedType, false);
                } else {
                    console.error('Could not detect MIME type of Blob.');
                    hideSpinner();
                }
                return;
            }

            if (blob.type.startsWith('image/') || blob.type.startsWith('video/')) {
                const objectURL = URL.createObjectURL(blob);
                this.messageHandler.handleMedia(objectURL, blob.type, true);
            } else {
                console.error('Unsupported Blob type:', blob.type);
                hideSpinner();
            }
        } catch (error) {
            console.error('Error processing Blob message:', error);
            hideSpinner();
        }
    }
}

export class MessageHandler {
    constructor() {
        this.lastImageFilenames = [];
        this.spinnerHidden = false;
        this.jsonProcessor = new JSONMessageProcessor(this);
        this.blobProcessor = new BlobMessageProcessor(this);
    }

    handleMessage(event) {
        if (typeof event.data === 'string') {
            this.jsonProcessor.process(event.data);
        } else if (event.data instanceof Blob) {
            this.blobProcessor.process(event.data);
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
                this.processImages(data.output.images);
            }

            if ('gifs' in data.output) {
                this.processGifs(data.output.gifs);
            }
        }
        hideSpinner();

        // console.log('Execution completed:', data);
        const event = new CustomEvent('jobCompleted');
        window.dispatchEvent(event);
    }

    processImages(images) {
        const newImageFilenames = [];
        const imageUrls = images.map(image => {
            const { filename } = image;
    
            if (filename.includes('ComfyUI_temp')) {
                return null;
            }
    
            if (this.lastImageFilenames.includes(filename)) {
                console.log('Duplicate image:', filename);
                return null;
            }
    
            newImageFilenames.push(filename);
            const imageUrl = `/view?filename=${encodeURIComponent(filename)}`;
            console.log('Image URL:', imageUrl);
            return imageUrl;
        }).filter(url => url !== null);
    
        if (imageUrls.length > 0) {
            displayImagesInDiv(imageUrls); 
            this.lastImageFilenames = newImageFilenames;
        }
    }
    
    processGifs(gifs) {
        const gifUrls = gifs.map(gif => {
            const { filename } = gif;
            const gifUrl = `/view?filename=${encodeURIComponent(filename)}`;
            return gifUrl;
        });

        console.log('GIF URLs:', gifUrls);
        displayImagesInDiv(gifUrls); 
    }

    handleMedia(mediaUrl, mediaType, addToHistory = true) {
        displayImagesInDiv([mediaUrl], addToHistory);
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
}

export function initializeWebSocket(clientId) {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const serverAddress = `${window.location.hostname}:${window.location.port}`;
    const messageHandler = new MessageHandler();
    const wsHandler = new WebSocketHandler(
        `${protocol}://${serverAddress}/ws?clientId=${encodeURIComponent(clientId)}`,
        (event) => messageHandler.handleMessage(event)
    );
    wsHandler.connect();
    return wsHandler;
}
