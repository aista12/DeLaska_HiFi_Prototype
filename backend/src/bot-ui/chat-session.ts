// Package: bot.ui - remembers where each customer is in the checkout conversation.
import { PaymentMethod } from '../payments/payment';

export enum CheckoutStep {
  BROWSING = 'BROWSING',
  FULFILMENT = 'FULFILMENT',
  BRANCH = 'BRANCH',
  ADDRESS = 'ADDRESS',
  PHONE = 'PHONE',
  COMMENT = 'COMMENT',
  PAYMENT = 'PAYMENT',
  SUMMARY = 'SUMMARY',
}

export interface CheckoutDraft {
  type?: 'pickup' | 'delivery';
  branchId?: string;
  address?: string;
  phone?: string;
  comment?: string;
  method?: PaymentMethod;
}

export class ChatSession {
  private step: CheckoutStep = CheckoutStep.BROWSING;
  private draft: CheckoutDraft = {};
  constructor(private chatId: string) {}

  getStep(): CheckoutStep { return this.step; }
  goTo(step: CheckoutStep): void { this.step = step; }
  getDraft(): CheckoutDraft { return this.draft; }
  reset(): void { this.step = CheckoutStep.BROWSING; this.draft = {}; }
}
