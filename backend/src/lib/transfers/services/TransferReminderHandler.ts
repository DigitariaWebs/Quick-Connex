/**
 * Transfer Reminder Handler
 * 
 * Handles reminder scheduling for transfer events.
 */

import { TransferStatus } from '../core/constants';
import {
  TransferEventType,
  TransferEventData,
  TransferEventHandler
} from './types';
import { TransferEventManager } from './TransferEventManager';

export class TransferReminderHandler implements TransferEventHandler {
  eventType = TransferEventType.TRANSFER_CREATED;

  async handle(_eventType: TransferEventType, eventData: TransferEventData): Promise<void> {
    const { transfer } = eventData;
    
    // Schedule reminders for pending transfers
    if (transfer.status === TransferStatus.PENDING && transfer.scheduledDate) {
      const scheduledDate = new Date(transfer.scheduledDate);
      const now = new Date();
      
      // Schedule reminder 1 hour before transfer
      const reminderTime = new Date(scheduledDate.getTime() - 60 * 60 * 1000);
      
      if (reminderTime > now) {
        setTimeout(async () => {
          await TransferEventManager.emitEvent(TransferEventType.TRANSFER_REMINDER, {
            transferId: transfer._id,
            transfer,
            changedBy: transfer.requestedBy,
            timestamp: new Date().toISOString(),
            metadata: {
              urgencyLevel: 'low'
            }
          });
        }, reminderTime.getTime() - now.getTime());
      }
    }
  }
}

