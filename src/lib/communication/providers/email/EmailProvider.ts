/**
 * Base Email Provider Interface
 * 
 * Defines the contract for all email providers.
 */

import {
  EmailMessage,
  CommunicationServiceResponse,
  CommunicationStatus,
  ICommunicationProvider,
  EmailProvider
} from '../../core/types';

/**
 * Base Email Provider Class
 */
export abstract class BaseEmailProvider implements ICommunicationProvider {
  abstract providerType: EmailProvider;

  constructor(protected config: any) {}

  abstract send(message: EmailMessage): Promise<CommunicationServiceResponse>;
  abstract getStatus(messageId: string): Promise<CommunicationStatus>;
  abstract validateConfiguration(): Promise<boolean>;
  abstract getCostEstimate(message: EmailMessage): Promise<number>;
}
