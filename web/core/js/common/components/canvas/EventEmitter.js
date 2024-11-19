export class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = new Set();
        }
        this.events[event].add(listener);
    }

    off(event, listener) {
        if (!this.events[event]) return;
        this.events[event].delete(listener);
    }

    emit(event, ...args) {
        if (!this.events[event]) return;
        for (let listener of this.events[event]) {
            listener(...args);
        }
    }
}
