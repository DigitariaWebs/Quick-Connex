/**
 * Communication Preferences Types
 * 
 * User preference types for communication channels and settings.
 */

import { CommunicationChannel } from './core.types';

/**
 * User Communication Preferences
 */
export interface UserCommunicationPreferences {
  userId: string;
  email: EmailPreferences;
  sms: SMSPreferences;
  push: PushPreferences;
  global: GlobalPreferences;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Email Preferences
 */
export interface EmailPreferences {
  enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  types: string[]; // Notification types user wants to receive
  format: 'html' | 'text' | 'both';
  language: string;
  timezone: string;
  quietHours?: QuietHours;
  filters: EmailFilter[];
  digest: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    time: string; // HH:MM format
    types: string[];
  };
}

/**
 * SMS Preferences
 */
export interface SMSPreferences {
  enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  types: string[]; // Notification types user wants to receive
  language: string;
  timezone: string;
  quietHours?: QuietHours;
  filters: SMSFilter[];
  emergency: {
    enabled: boolean;
    alwaysReceive: boolean;
    overrideQuietHours: boolean;
  };
}

/**
 * Push Preferences
 */
export interface PushPreferences {
  enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  types: string[]; // Notification types user wants to receive
  sound: boolean;
  vibration: boolean;
  badge: boolean;
  quietHours?: QuietHours;
  filters: PushFilter[];
  channels: PushChannel[];
}

/**
 * Global Preferences
 */
export interface GlobalPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  theme: 'light' | 'dark' | 'auto';
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    screenReader: boolean;
  };
  privacy: {
    dataRetention: number; // in days
    analytics: boolean;
    personalization: boolean;
  };
}

/**
 * Quiet Hours
 */
export interface QuietHours {
  enabled: boolean;
  start: string; // HH:MM format
  end: string; // HH:MM format
  timezone: string;
  days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  exceptions: QuietHoursException[];
}

/**
 * Quiet Hours Exception
 */
export interface QuietHoursException {
  start: Date;
  end: Date;
  reason: string;
  types: string[]; // Notification types that are allowed
}

/**
 * Email Filter
 */
export interface EmailFilter {
  id: string;
  name: string;
  enabled: boolean;
  conditions: EmailFilterCondition[];
  actions: EmailFilterAction[];
  priority: number;
}

/**
 * Email Filter Condition
 */
export interface EmailFilterCondition {
  field: 'sender' | 'subject' | 'content' | 'type' | 'priority';
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex';
  value: string;
  caseSensitive: boolean;
}

/**
 * Email Filter Action
 */
export interface EmailFilterAction {
  type: 'move_to_folder' | 'mark_as_read' | 'delete' | 'forward' | 'label';
  value: string;
}

/**
 * SMS Filter
 */
export interface SMSFilter {
  id: string;
  name: string;
  enabled: boolean;
  conditions: SMSFilterCondition[];
  actions: SMSFilterAction[];
  priority: number;
}

/**
 * SMS Filter Condition
 */
export interface SMSFilterCondition {
  field: 'sender' | 'content' | 'type' | 'priority';
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex';
  value: string;
  caseSensitive: boolean;
}

/**
 * SMS Filter Action
 */
export interface SMSFilterAction {
  type: 'block' | 'allow' | 'forward' | 'reply';
  value: string;
}

/**
 * Push Filter
 */
export interface PushFilter {
  id: string;
  name: string;
  enabled: boolean;
  conditions: PushFilterCondition[];
  actions: PushFilterAction[];
  priority: number;
}

/**
 * Push Filter Condition
 */
export interface PushFilterCondition {
  field: 'app' | 'type' | 'priority' | 'sender';
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex';
  value: string;
  caseSensitive: boolean;
}

/**
 * Push Filter Action
 */
export interface PushFilterAction {
  type: 'show' | 'hide' | 'sound' | 'vibrate' | 'badge';
  value: string;
}

/**
 * Push Channel
 */
export interface PushChannel {
  id: string;
  name: string;
  enabled: boolean;
  provider: 'fcm' | 'apns' | 'web_push';
  config: Record<string, any>;
  lastUsed?: Date;
}

/**
 * Notification Type
 */
export interface NotificationType {
  id: string;
  name: string;
  description: string;
  category: string;
  channels: CommunicationChannel[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  defaultEnabled: boolean;
  userConfigurable: boolean;
  template?: string;
  variables: string[];
}

/**
 * Preference Update Request
 */
export interface PreferenceUpdateRequest {
  userId: string;
  updates: Partial<UserCommunicationPreferences>;
  validate?: boolean;
  notify?: boolean;
}

/**
 * Preference Update Response
 */
export interface PreferenceUpdateResponse {
  success: boolean;
  updated: Partial<UserCommunicationPreferences>;
  errors: string[];
  warnings: string[];
}

/**
 * Preference Validation Result
 */
export interface PreferenceValidationResult {
  valid: boolean;
  errors: PreferenceValidationError[];
  warnings: PreferenceValidationWarning[];
}

/**
 * Preference Validation Error
 */
export interface PreferenceValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * Preference Validation Warning
 */
export interface PreferenceValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * Preference Migration
 */
export interface PreferenceMigration {
  fromVersion: string;
  toVersion: string;
  changes: PreferenceChange[];
  automated: boolean;
  requiresUserAction: boolean;
}

/**
 * Preference Change
 */
export interface PreferenceChange {
  field: string;
  action: 'add' | 'remove' | 'modify' | 'rename';
  oldValue?: any;
  newValue?: any;
  description: string;
}

