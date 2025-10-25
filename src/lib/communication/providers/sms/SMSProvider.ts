/**
 * Base SMS Provider Interface
 * 
 * Defines the contract for all SMS providers.
 */

import {
  SMSMessage,
  CommunicationServiceResponse,
  CommunicationStatus,
  ICommunicationProvider,
  SMSProvider
} from '../../core/types';

/**
 * Base SMS Provider Class
 */
export abstract class BaseSMSProvider implements ICommunicationProvider {
  abstract providerType: SMSProvider;

  constructor(protected config: any) {}

  abstract send(message: SMSMessage): Promise<CommunicationServiceResponse>;
  abstract getStatus(messageId: string): Promise<CommunicationStatus>;
  abstract validateConfiguration(): Promise<boolean>;
  abstract getCostEstimate(message: SMSMessage): Promise<number>;
}
