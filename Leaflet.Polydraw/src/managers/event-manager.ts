import { PolydrawEvent, PolydrawEventCallback } from '../types/polydraw-interfaces';

export class EventManager {
  private eventListeners: Map<PolydrawEvent, PolydrawEventCallback[]> = new Map();

  /**
   * Register an event listener.
   * @param event - The event to listen for.
   * @param callback - The callback to execute when the event is emitted.
   */
  on(event: PolydrawEvent, callback: PolydrawEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  /**
   * Unregister an event listener.
   * @param event - The event to stop listening for.
   * @param callback - The specific callback to remove.
   */
  off(event: PolydrawEvent, callback: PolydrawEventCallback): void {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }
  }

  /**
   * Emit an event.
   * @param event - The event to emit.
   * @param data - The data to pass to the event listeners.
   */
  emit(event: PolydrawEvent, data?: any): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)?.forEach((callback) => callback(data));
    }
  }
}
