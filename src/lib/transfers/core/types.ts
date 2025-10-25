/**
 * Transfer Timeline Types
 * 
 * TypeScript interfaces for transfer timeline functionality.
 */

import { Types } from 'mongoose';
import { TimelineEventType } from '@/types/transfer';

export interface TimelineEventData {
  type: TimelineEventType;
  title: string;
  description: string;
  actor: {
    id: Types.ObjectId;
    name: string;
    email: string;
    userType: 'manager' | 'employee' | 'admin';
  };
  metadata?: {
    oldValue?: any;
    newValue?: any;
    reason?: string;
    details?: string;
    [key: string]: any;
  };
  isSystemEvent?: boolean;
  isVisible?: boolean;
}

