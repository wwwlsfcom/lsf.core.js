import Signals from 'signals';


class EventDispatcher {

    private signals = new Map<Symbol, Signals>();
    private static instance = new EventDispatcher();


    static getInstance() {
        return EventDispatcher.instance;
    }

    private constructor() {
    }

    addListener(eventName, listener: (data?) => void) {
        let event = this.signals.get(eventName);
        if (!event) {
            event = new Signals();
            this.signals.set(eventName, event);
        }
        event.add(params => {
            listener(params);
        });
    }

    dispatch(eventName, params?) {
        let event = this.signals.get(eventName);
        if (event) {
            event.dispatch(params);
        }
    }

    removeListener(eventName, callback) {
        const signal = this.signals.get(eventName);
        if (signal)
            signal.remove(callback);
    }
}

export function emit(eventName, data = null) {
    EventDispatcher.getInstance().dispatch(eventName, data);
}

export function listener(eventName, callback) {
    EventDispatcher.getInstance().addListener(eventName, callback);
}

export function removeListener(eventName, callback) {
    EventDispatcher.getInstance().removeListener(eventName, callback);
}
