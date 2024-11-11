import state from './state.js';

class StateManager {
    static addJob(job) {
        state.jobQueue.push(job);
    }

    static getNextJob() {
        return state.jobQueue[0];
    }

    static removeJob() {
        state.jobQueue.shift();
    }

    static incrementJobId() {
        state.currentJobId += 1;
        return state.currentJobId;
    }

    static setProcessing(value) {
        state.isProcessing = value;
    }

    static isProcessing() {
        return state.isProcessing;
    }

    static getJobQueue() {
        return state.jobQueue;
    }

    static getCurrentJobId() {
        return state.currentJobId;
    }
}

export default StateManager;
