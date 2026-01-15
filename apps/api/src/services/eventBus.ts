import { EventEmitter } from 'events';

export type EventPayloads = {
    'order.created': { orderId: number; source: string };
    'inventory.broadcast': { source?: string; payload: string };
};

class TypedEventBus extends EventEmitter {
    emit<EventKey extends keyof EventPayloads>(event: EventKey, payload: EventPayloads[EventKey]): boolean {
        return super.emit(event, payload);
    }

    on<EventKey extends keyof EventPayloads>(event: EventKey, listener: (payload: EventPayloads[EventKey]) => void): this {
        return super.on(event, listener);
    }
}

export const eventBus = new TypedEventBus();
