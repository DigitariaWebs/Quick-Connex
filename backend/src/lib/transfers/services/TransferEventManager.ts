/**
 * Transfer Event Manager
 * 
 * Manages the transfer event system and coordinates event handlers.
 */

import { TransferEventType, TransferEventData, TransferEventHandler } from './types';

export class TransferEventManager {
  private static handlers: Map<TransferEventType, TransferEventHandler[]> = new Map();
  private static isInitialized = false;

  /**
   * Initialize the event system
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Register default handlers
    const { TransferNotificationHandler } = await import('./TransferNotificationHandler');
    const { TransferAuditHandler } = await import('./TransferAuditHandler');
    const { TransferReminderHandler } = await import('./TransferReminderHandler');

    this.registerHandler(new TransferNotificationHandler());
    this.registerHandler(new TransferAuditHandler());
    this.registerHandler(new TransferReminderHandler());

    this.isInitialized = true;
    console.log('🔄 Transfer Event System initialized');
  }

  /**
   * Register an event handler
   */
  static registerHandler(handler: TransferEventHandler): void {
    const handlers = this.handlers.get(handler.eventType) || [];
    handlers.push(handler);
    this.handlers.set(handler.eventType, handlers);
  }

  /**
   * Emit a transfer event
   */
  static async emitEvent(
    eventType: TransferEventType,
    eventData: TransferEventData
  ): Promise<void> {
    try {
      const handlers = this.handlers.get(eventType) || [];
      
      // Execute all handlers for this event type
      await Promise.all(
        handlers.map(handler => 
          this.executeHandler(handler, eventType, eventData)
        )
      );

      console.log(`📡 Transfer event emitted: ${eventType}`, {
        transferId: eventData.transferId,
        timestamp: eventData.timestamp
      });

    } catch (error) {
      console.error('Error emitting transfer event:', error);
      // Don't throw - event emission should not break the main flow
    }
  }

  /**
   * Execute a single handler with error handling
   */
  private static async executeHandler(
    handler: TransferEventHandler,
    eventType: TransferEventType,
    eventData: TransferEventData
  ): Promise<void> {
    try {
      await handler.handle(eventType, eventData);
    } catch (error) {
      console.error(`Error in event handler for ${handler.eventType}:`, error);
    }
  }
}
