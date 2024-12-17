import { IMessageProcessor } from './IMessageProcessor.js';
import { hideSpinner } from './utils.js';
import { detectMimeType } from './mimeTypeDetector.js';

export class BlobMessageProcessor extends IMessageProcessor {
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
