/**
 * Communication Cost Calculator
 * 
 * Cost calculation functions for different communication providers.
 */

import { EmailMessage, SMSMessage } from '../core/types';

/**
 * Calculate cost for sending email
 */
export function calculateEmailCost(message: EmailMessage, provider: string): number {
  switch (provider) {
    case 'sendgrid':
      return 0.00075; // SendGrid pricing: $0.00075 per email
    case 'gmail-api':
    case 'gmail-smtp':
      return 0; // Gmail is free
    case 'ses':
      return 0.0001; // AWS SES pricing
    case 'mailgun':
      return 0.0008; // Mailgun pricing
    case 'resend':
      return 0.0004; // Resend pricing
    default:
      return 0;
  }
}

/**
 * Calculate cost for sending SMS
 */
export function calculateSMSCost(message: SMSMessage, provider: string): number {
  switch (provider) {
    case 'twilio':
      return 0.0075; // Twilio pricing (varies by country)
    case 'aws-sns':
      return 0.0075; // AWS SNS pricing
    case 'messagebird':
      return 0.008; // MessageBird pricing
    case 'vonage':
      return 0.0075; // Vonage pricing
    case 'plivo':
      return 0.0075; // Plivo pricing
    default:
      return 0;
  }
}

/**
 * Get cost estimate for a batch of messages
 */
export function calculateBatchCost(messages: (EmailMessage | SMSMessage)[], provider: string): number {
  let totalCost = 0;
  
  for (const message of messages) {
    if (message.channel === 'email') {
      totalCost += calculateEmailCost(message as EmailMessage, provider);
    } else if (message.channel === 'sms') {
      totalCost += calculateSMSCost(message as SMSMessage, provider);
    }
  }
  
  return totalCost;
}

/**
 * Get monthly cost estimate based on message volume
 */
export function calculateMonthlyCostEstimate(
  emailCount: number,
  smsCount: number,
  emailProvider: string,
  smsProvider: string
): { email: number; sms: number; total: number } {
  const emailCost = emailCount * calculateEmailCost({} as EmailMessage, emailProvider);
  const smsCost = smsCount * calculateSMSCost({} as SMSMessage, smsProvider);
  
  return {
    email: emailCost,
    sms: smsCost,
    total: emailCost + smsCost
  };
}

/**
 * Get cost per message by provider and channel
 */
export function getCostPerMessage(provider: string, channel: 'email' | 'sms'): number {
  if (channel === 'email') {
    return calculateEmailCost({} as EmailMessage, provider);
  } else {
    return calculateSMSCost({} as SMSMessage, provider);
  }
}

/**
 * Calculate cost savings by switching providers
 */
export function calculateProviderSavings(
  currentProvider: string,
  newProvider: string,
  channel: 'email' | 'sms',
  messageCount: number
): number {
  const currentCost = getCostPerMessage(currentProvider, channel);
  const newCost = getCostPerMessage(newProvider, channel);
  const savingsPerMessage = currentCost - newCost;
  
  return savingsPerMessage * messageCount;
}

/**
 * Get provider cost comparison
 */
export function getProviderCostComparison(channel: 'email' | 'sms'): Record<string, number> {
  const providers = channel === 'email' 
    ? ['sendgrid', 'gmail-api', 'ses', 'mailgun', 'resend']
    : ['twilio', 'aws-sns', 'messagebird', 'vonage', 'plivo'];
  
  const comparison: Record<string, number> = {};
  
  for (const provider of providers) {
    comparison[provider] = getCostPerMessage(provider, channel);
  }
  
  return comparison;
}
