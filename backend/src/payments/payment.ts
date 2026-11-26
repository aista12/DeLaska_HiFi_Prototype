// Package: payments (business layer) - Class diagram A.
import type { Order } from '../ordering/models';

export enum PaymentMethod {
  CLICK = 'CLICK',
  PAYME = 'PAYME',
  CASH = 'CASH',
  CARD_TERMINAL = 'CARD_TERMINAL',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PAY_ON_RECEIPT = 'PAY_ON_RECEIPT',
  FAILED = 'FAILED',
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  CLICK: 'Click',
  PAYME: 'Payme',
  CASH: 'Cash',
  CARD_TERMINAL: 'Card (terminal)',
};

export class Payment {
  private status: PaymentStatus = PaymentStatus.PENDING;
  private transactionId = '';
  constructor(private method: PaymentMethod, private amount: number) {}
  getMethod(): PaymentMethod { return this.method; }
  getAmount(): number { return this.amount; }
  getStatus(): PaymentStatus { return this.status; }
  getTransactionId(): string { return this.transactionId; }
  isPaid(): boolean { return this.status === PaymentStatus.PAID; }
  isOnline(): boolean { return this.method === PaymentMethod.CLICK || this.method === PaymentMethod.PAYME; }
  confirm(transactionId: string): void {
    this.transactionId = transactionId;
    this.status = PaymentStatus.PAID;
  }
  payOnReceipt(): void { this.status = PaymentStatus.PAY_ON_RECEIPT; }
}

/** Interface: "encapsulate the change" - new payment methods are added as new providers. */
export interface PaymentProvider {
  pay(order: Order): Payment;
  verify(payment: Payment): boolean;
}

const txId = (prefix: string) => `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

/** Simulated Click merchant API (prototype: payment always succeeds). */
export class ClickProvider implements PaymentProvider {
  constructor(private merchantId = 'demo-click-merchant', private secretKey = process.env.CLICK_SECRET ?? '') {}
  pay(order: Order): Payment {
    const payment = order.getPayment();
    payment.confirm(txId('CLK'));
    return payment;
  }
  verify(payment: Payment): boolean { return payment.isPaid(); }
}

/** Simulated Payme merchant API (prototype: payment always succeeds). */
export class PaymeProvider implements PaymentProvider {
  constructor(private merchantId = 'demo-payme-merchant', private secretKey = process.env.PAYME_SECRET ?? '') {}
  pay(order: Order): Payment {
    const payment = order.getPayment();
    payment.confirm(txId('PME'));
    return payment;
  }
  verify(payment: Payment): boolean { return payment.isPaid(); }
}

/** Cash or card terminal: paid to the cashier or courier on receipt. */
export class CashProvider implements PaymentProvider {
  pay(order: Order): Payment {
    const payment = order.getPayment();
    payment.payOnReceipt();
    return payment;
  }
  verify(payment: Payment): boolean { return payment.getStatus() === PaymentStatus.PAY_ON_RECEIPT; }
}

/** Factory picks the provider, so OrderService never depends on a concrete payment class. */
export class PaymentFactory {
  private click = new ClickProvider();
  private payme = new PaymeProvider();
  private cash = new CashProvider();

  getProvider(method: PaymentMethod): PaymentProvider {
    switch (method) {
      case PaymentMethod.CLICK: return this.click;
      case PaymentMethod.PAYME: return this.payme;
      case PaymentMethod.CASH:
      case PaymentMethod.CARD_TERMINAL: return this.cash;
    }
  }
}
