// Package: ordering - services (business logic).
import { Cart, Category, Customer, Fulfilment, Order, OrderItem, Product } from './models';
import { Payment, PaymentFactory, PaymentMethod } from '../payments/payment';
import { PosSystem } from '../integrations/integrations';
import { ErrorLog, OrderRepository } from '../persistence/persistence';
import { EventBus, OrderRegisteredEvent } from '../notifications/notifications';

/** Menu always comes from the POS (iiko) so prices and availability stay in sync (FR-01). */
export class MenuService {
  private cache: Category[] = [];
  constructor(private pos: PosSystem) {}

  getCategories(): Category[] {
    if (this.cache.length === 0) this.refresh();
    return this.cache;
  }
  findProduct(productId: string): Product | undefined {
    return this.getCategories().flatMap((c) => c.getProducts()).find((p) => p.getId() === productId);
  }
  findCategoryOf(productId: string): Category | undefined {
    return this.getCategories().find((c) => c.getProducts().some((p) => p.getId() === productId));
  }
  refresh(): void { this.cache = this.pos.getMenu(); }
}

export class OrderService {
  constructor(
    private pos: PosSystem,
    private paymentFactory: PaymentFactory,
    private repository: OrderRepository,
    private eventBus: EventBus,
    private errorLog: ErrorLog,
  ) {}

  /** FR-04: builds the order, takes payment, then hands it to registerOrder (FR-05). */
  checkout(customer: Customer, cart: Cart, fulfilment: Fulfilment, method: PaymentMethod, comment = ''): Order {
    if (cart.isEmpty()) throw new Error('Your cart is empty.');
    if (!fulfilment.validate()) throw new Error('Pickup / delivery details are not valid.');

    const items = cart.getItems().map(
      (i) => new OrderItem(i.getProduct().getName(), i.getProduct().getPrice(), i.getQuantity()),
    );
    const payment = new Payment(method, cart.getTotal());
    const order = new Order(this.repository.nextOrderNumber(), customer, items, fulfilment, payment, comment);
    this.repository.save(order);

    const provider = this.paymentFactory.getProvider(method);
    provider.pay(order);
    if (!provider.verify(payment)) {
      order.markFailed('Payment could not be confirmed');
      throw new Error('Payment failed. Please try again.');
    }
    if (payment.isPaid()) order.markPaid();

    this.registerOrder(order);
    return order;
  }

  /** Sends the order to iiko once; checks first so a retry never duplicates it (NFR-03). */
  registerOrder(order: Order): void {
    try {
      const existing = this.pos.findOrder(order.getOrderNumber());
      const posOrderId = existing ?? this.pos.createOrder(order);
      order.markRegistered(posOrderId);
      this.repository.save(order);
      this.eventBus.publish(new OrderRegisteredEvent(order));
    } catch (e) {
      order.markFailed((e as Error).message);
      this.errorLog.record('OrderService', `iiko registration failed for ${order.getOrderNumber()}`);
      throw e;
    }
  }
}
