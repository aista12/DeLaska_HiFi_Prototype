// Package: persistence (data layer). In-memory for the prototype.
import type { Order } from '../ordering/models';

export class OrderRepository {
  private orders = new Map<string, Order>();
  private counter = 1000;

  nextOrderNumber(): string { this.counter += 1; return `DL-${this.counter}`; }
  save(order: Order): void { this.orders.set(order.getOrderNumber(), order); }
  findByNumber(orderNumber: string): Order | undefined { return this.orders.get(orderNumber); }
  reset(): void { this.orders.clear(); this.counter = 1000; }
}

export interface LogEntry { at: string; source: string; message: string; }

export class ErrorLog {
  private entries: LogEntry[] = [];
  record(source: string, message: string): void {
    this.entries.push({ at: new Date().toISOString(), source, message });
  }
  getEntries(): LogEntry[] { return [...this.entries]; }
}
