class StateManager {
    constructor(initialState = {}) {
        // console.log('StateManager initializing with:', initialState);
        this.state = initialState;
        this.listeners = new Set();
        this.history = [];
        this.historyLimit = 100;

        this.dispatch = this.dispatch.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.getState = this.getState.bind(this);
        
        this.state = new Proxy(this.state, {
            set: () => {
                throw new Error('Direct state mutation is not allowed. Use dispatch instead.');
            }
        });
    }

    getState() {
        // console.log('Getting current state:', this.state);
        return Object.freeze({ ...this.state });
    }

    subscribe(listener) {
        // console.log('New subscriber added to StateManager');
        if (typeof listener !== 'function') {
            throw new TypeError('Listener must be a function');
        }
        this.listeners.add(listener);
        
        listener(this.getState());

        return () => {
            // console.log('Subscriber removed from StateManager');
            this.listeners.delete(listener);
        };
    }

    dispatch(action) {
        // console.log('Action dispatched:', action);
        if (!action || typeof action !== 'object' || !action.type) {
            throw new TypeError('Action must be an object with a type property');
        }

        try {
            const nextState = this.reducer(this.state, action);
            
            if (nextState === undefined || nextState === null) {
                throw new Error('Reducer must return a valid state object');
            }

            // console.log('Previous state:', this.state);
            // console.log('Next state:', nextState);

            this.state = nextState;
            
            this.saveToHistory(action, nextState);
            
            this.notifyListeners();
            
            return true;
        } catch (error) {
            console.error('Error dispatching action:', error);
            return false;
        }
    }

    reducer(state, action) {
        switch (action.type) {
            case 'SET_VIEW':
                return { ...state, viewType: action.payload };
            case 'TOGGLE_MASK':
                return { ...state, hideMask: !state.hideMask };
            case 'SET_HIDE_MASK':
                return { ...state, hideMask: action.payload };
            case 'SET_CROPPED_IMAGE':
                return { ...state, croppedImage: action.payload };
            case 'SET_MASKING_TYPE':
                return { ...state, maskingType: action.payload };
            case 'RESET_STATE':
                return this.constructor.initialState;
            default:
                return state;
        }
    }

    notifyListeners() {
        // console.log('Notifying', this.listeners.size, 'listeners');
        this.listeners.forEach(listener => {
            try {
                listener(this.getState());
            } catch (error) {
                console.error('Error in listener:', error);
            }
        });
    }

    saveToHistory(action, state) {
        const timestamp = new Date().toISOString();
        this.history.push({
            action,
            state: { ...state },
            timestamp
        });

        if (this.history.length > this.historyLimit) {
            this.history.shift();
        }
        // console.log('History updated, current length:', this.history.length);
    }
}

export const store = new StateManager({
    viewType: 'standardView', // Possible values: 'standardView', 'canvasView', 'splitView'
    hideMask:false,
    croppedImage: {},
    maskingType: 'full', // Possible values: 'full', 'cropped'
});
