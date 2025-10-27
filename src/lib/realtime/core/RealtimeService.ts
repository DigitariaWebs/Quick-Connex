/**
 * Realtime Service
 * 
 * Main service for realtime functionality
 * Acts as a facade/wrapper around NotificationService
 */

import { NotificationService } from './NotificationService';
import { log } from '@/lib/logging';

export class RealtimeService {
  private static instance: RealtimeService;
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  /**
   * Get the underlying notification service
   */
  public getNotificationService(): NotificationService {
    return this.notificationService;
  }

  /**
   * Initialize with Socket.io instance
   * This method can be extended to set up socket-specific functionality
   */
  public initialize(io: any): void {
    log.info('RealtimeService initialized with Socket.io instance');
    // Future: Add socket-specific initialization logic here
  }

  /**
   * Initialize Socket.io server integration
   */
  public async initializeSocketIO(server: any): Promise<void> {
    log.info('RealtimeService initializing Socket.io integration');
    // Future: Add Socket.io server initialization logic here
  }
}
