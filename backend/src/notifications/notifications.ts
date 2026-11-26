// Package: notifications (business layer, event-driven) - Class diagram B.
import { Order, Delivery } from '../ordering/models';
import { METHOD_LABEL } from '../payments/payment';
import { YandexGeocoder } from '../integrations/integrations';
import { ErrorLog } from '../persistence/persistence';
import { TelegramApi } from '../simulator/telegram-api';
import { formatMoney } from '../bot-ui/message-formatter';

export class OrderRegisteredEvent {
  private occurredAt = new Date();
  constructor(private order: Order) {}
  getOrder(): Order { return this.order; }
  getOccurredAt(): Date { return this.occurredAt; }
}

/** Polymorphism: each group notifier formats and sends its own message. */
export interface Notifier {
  notify(event: OrderRegisteredEvent): void;
}

export class EventBus {
  private subscribers: Notifier[] = [];
  subscribe(notifier: Notifier): void { this.subscribers.push(notifier); }
  publish(event: OrderRegisteredEvent): void {
    this.subscribers.forEach((s) => s.notify(event));
  }
}

/** NFR-04: retry 3 times, 30 s apart; failures are logged, never counted as delivered. */
export class RetryPolicy {
  constructor(private errorLog: ErrorLog, private maxAttempts: number = 3, private delaySeconds: number = 30) {}

  run(task: () => void, source: string): boolean {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        task();
        return true;
      } catch (e) {
        // Production: wait this.delaySeconds before the next attempt (scheduled job).
        this.errorLog.record(source, `attempt ${attempt} failed: ${(e as Error).message}`);
      }
    }
    return false;
  }
}

export class OperatorNotifier implements Notifier {
  constructor(private groupChatId: string, private telegram: TelegramApi, private retry: RetryPolicy) {}

  notify(event: OrderRegisteredEvent): void {
    const text = this.formatMessage(event.getOrder());
    this.retry.run(() => this.telegram.sendMessage(this.groupChatId, text), 'OperatorNotifier');
  }

  private formatMessage(order: Order): string {
    const f = order.getFulfilment();
    const p = order.getPayment();
    const lines = [
      `🆕 New order #${order.getOrderNumber()} · Telegram bot`,
      `${f.getType()} · ${f.getBranch().getName()}`,
      '',
      ...order.getItems().map((i) => `${i.getQuantity()} × ${i.getProductName()} — ${formatMoney(i.getSubtotal())}`),
      `Total: ${formatMoney(order.getTotal())}`,
      `Payment: ${METHOD_LABEL[p.getMethod()]} (${p.isPaid() ? 'paid ✅' : 'on receipt'})`,
      '',
      `Customer: ${order.getCustomer().getName()}, ${order.getCustomer().getPhone()}`,
    ];
    if (f instanceof Delivery) lines.push(`Address: ${f.getAddress()}`);
    if (order.getComment()) lines.push(`Comment: ${order.getComment()}`);
    lines.push(`iiko: ${order.getPosOrderId()} ✔ registered automatically`);
    return lines.join('\n');
  }
}

export class CourierNotifier implements Notifier {
  constructor(
    private groupChatId: string,
    private telegram: TelegramApi,
    private retry: RetryPolicy,
    private geocoder: YandexGeocoder,
  ) {}

  notify(event: OrderRegisteredEvent): void {
    const order = event.getOrder();
    const f = order.getFulfilment();
    if (!(f instanceof Delivery)) return; // pickup orders are not sent to couriers (UC-04, 1a)
    const mapLink = this.geocoder.linkFor(f);
    const text = this.formatMessage(order, mapLink);
    this.retry.run(
      () => this.telegram.sendMessage(this.groupChatId, text, { link: { label: '🗺 Open in Yandex Maps', url: mapLink } }),
      'CourierNotifier',
    );
  }

  private formatMessage(order: Order, mapLink: string): string {
    const f = order.getFulfilment() as Delivery;
    const p = order.getPayment();
    return [
      `🚚 Delivery #${order.getOrderNumber()}`,
      `From: ${f.getBranch().getName()}`,
      `Address: ${f.getAddress()}`,
      `Phone: ${order.getCustomer().getPhone()}`,
      p.isPaid() ? 'To collect: nothing (paid online)' : `To collect: ${formatMoney(order.getTotal())} (${METHOD_LABEL[p.getMethod()]})`,
    ].join('\n');
  }
}
