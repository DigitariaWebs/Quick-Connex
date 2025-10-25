/**
 * Communication Event Registry
 * 
 * Registry for managing communication event handlers.
 */

import { log } from '@/lib/services';
import {
  CommunicationEventType,
  CommunicationEventData,
  ICommunicationEventHandler
} from '../core/types';

/**
 * Event Handler Registry
 */
export class EventHandlerRegistry {
  private handlers: Map<CommunicationEventType, ICommunicationEventHandler[]> = new Map();

  /**
   * Register event handler
   */
  registerHandler(handler: ICommunicationEventHandler): void {
    const handlers = this.handlers.get(handler.eventType) || [];
    handlers.push(handler);
    this.handlers.set(handler.eventType, handlers);
  }

  /**
   * Unregister event handler
   */
  unregisterHandler(handler: ICommunicationEventHandler): void {
    const handlers = this.handlers.get(handler.eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.handlers.set(handler.eventType, handlers);
    }
  }

  /**
   * Handle communication event
   */
  async handleEvent(eventData: CommunicationEventData): Promise<void> {
    const handlers = this.handlers.get(eventData.eventType) || [];
    
    // Execute all handlers in parallel
    await Promise.all(
      handlers.map(handler => 
        handler.handle(eventData).catch(error => 
          log.error(`Event handler error for ${eventData.eventType}:`, error)
        )
      )
    );
  }

  /**
   * Get registered handlers for event type
   */
  getHandlers(eventType: CommunicationEventType): ICommunicationEventHandler[] {
    return this.handlers.get(eventType) || [];
  }

  /**
   * Clear all handlers
   */
  clearHandlers(): void {
    this.handlers.clear();
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): CommunicationEventType[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Create event handler registry with default handlers
 */
export function createEventHandlerRegistry(): EventHandlerRegistry {
  const registry = new EventHandlerRegistry();
  
  // Register default handlers
  const defaultHandlers = [
    new (require('./handlers').CommunicationAnalyticsHandler)(),
    new (require('./handlers').CommunicationLoggingHandler)(),
    new (require('./handlers').CommunicationNotificationHandler)(),
    new (require('./handlers').CommunicationAuditHandler)(),
    new (require('./handlers').CommunicationMetricsHandler)()
  ];
  
  defaultHandlers.forEach(handler => {
    registry.registerHandler(handler);
  });
  
  return registry;
}

/**
 * Handle communication event with all registered handlers
 */
export async function handleCommunicationEvent(
  eventData: CommunicationEventData,
  registry: EventHandlerRegistry
): Promise<void> {
  await registry.handleEvent(eventData);
}
