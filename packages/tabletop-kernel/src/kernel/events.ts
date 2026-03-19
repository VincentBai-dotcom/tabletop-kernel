import type { KernelEvent } from "../types/event";

export interface EventCollector<Event extends KernelEvent = KernelEvent> {
  emit(event: Event): void;
  list(): Event[];
}

export function createEventCollector<
  Event extends KernelEvent = KernelEvent,
>(): EventCollector<Event> {
  const events: Event[] = [];

  return {
    emit(event) {
      events.push(event);
    },
    list() {
      return [...events];
    },
  };
}
