import { IMessageProcessor } from './IMessageProcessor.js';
import { hideSpinner } from './utils.js';

export class JSONMessageProcessor extends IMessageProcessor {
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
                    this.messageHandler.handleMonitor(data.data);
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
