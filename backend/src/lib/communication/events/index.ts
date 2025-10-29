/**
 * Communication Events
 * 
 * Event system for communication operations.
 * Simplified version that logs events (audit integration can be added later).
 */

import { CommunicationEventData, CommunicationEventType } from '../../../types/communication';
import { log } from '../../logging';

/**
 * Event handler registry
 */
export class EventHandlerRegistry {
  private handlers: Map<CommunicationEventType, Function[]> = new Map();

  /**
   * Register event handler
   */
  registerHandler(eventType: CommunicationEventType, handler: Function): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Get handlers for event type
   */
  getHandlers(eventType: CommunicationEventType): Function[] {
    return this.handlers.get(eventType) || [];
  }
}

/**
 * Create event handler registry
 */
export function createEventHandlerRegistry(): EventHandlerRegistry {
  return new EventHandlerRegistry();
}

/**
 * Handle communication event
 */
export async function handleCommunicationEvent(eventData: CommunicationEventData): Promise<void> {
  try {
    // Log to application log
    log.info('Communication event processed', {
      category: 'communication',
      operation: 'event_processed',
      eventType: eventData.eventType,
      messageId: eventData.messageId,
      channel: eventData.channel,
      status: eventData.status,
      recipient: eventData.recipient.email || eventData.recipient.phone,
      metadata: eventData.metadata
    });

    // TODO: Integrate with audit system when available
    // This would call AuditService.logCommunicationAction() when the audit service is implemented
    
  } catch (error) {
    log.error('Error handling communication event', error, {
      category: 'communication',
      operation: 'event_error',
      eventType: eventData.eventType,
      messageId: eventData.messageId
    });
  }
}