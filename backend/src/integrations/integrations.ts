// Package: integrations (integration layer) - Class diagram B.
import { Category, Product, Order, Delivery } from '../ordering/models';
import { METHOD_LABEL } from '../payments/payment';

/** Dependency Inversion: business classes depend on this interface, not on iiko. */
export interface PosSystem {
  getMenu(): Category[];
  createOrder(order: Order): string;
  findOrder(orderNumber: string): string | null;
}

export interface PosOrderRecord {
  posOrderId: string;
  orderNumber: string;
  source: string;
  type: string;
  branch: string;
  items: string;
  total: number;
  payment: string;
  receivedAt: string;
}

/**
 * IikoClient - in production this calls the iiko Cloud API (api-ru.iiko.services).
 * In this prototype the API is simulated in memory so the flow can be demonstrated.
 */
export class IikoClient implements PosSystem {
  private received = new Map<string, PosOrderRecord>();

  constructor(
    private apiLogin: string = process.env.IIKO_API_LOGIN ?? 'demo',
    private organizationId: string = 'delaska-org',
    private terminalGroupId: string = 'delaska-terminals',
  ) {}

  getMenu(): Category[] {
    return [
      new Category('croissants', '🥐 Croissants', [
        new Product('p1', 'Classic butter croissant', 18000, true, 'Flaky French butter croissant'),
        new Product('p2', 'Almond croissant', 26000, true, 'Filled with almond cream, topped with flakes'),
        new Product('p3', 'Chocolate croissant', 24000, true, 'Pain au chocolat with dark chocolate'),
        new Product('p4', 'Pistachio croissant', 32000, true, 'Pistachio cream filling'),
      ]),
      new Category('desserts', '🍰 Desserts', [
        new Product('p5', 'Napoleon slice', 28000, true, 'Layers of puff pastry and custard'),
        new Product('p6', 'Cheesecake', 30000, true, 'Classic baked cheesecake'),
        new Product('p7', 'Medovik', 27000, true, 'Honey cake'),
        new Product('p8', 'Éclair', 15000, false, 'Sold out today'),
      ]),
      new Category('drinks', '☕ Drinks', [
        new Product('p9', 'Cappuccino', 22000, true, '250 ml'),
        new Product('p10', 'Latte', 24000, true, '350 ml'),
        new Product('p11', 'Fresh orange juice', 25000, true, '300 ml'),
      ]),
    ];
  }

  createOrder(order: Order): string {
    const posOrderId = `IIKO-${Math.floor(10000 + Math.random() * 90000)}`;
    const f = order.getFulfilment();
    this.received.set(order.getOrderNumber(), {
      posOrderId,
      orderNumber: order.getOrderNumber(),
      source: 'Telegram bot',
      type: f.getType(),
      branch: f.getBranch().getName(),
      items: order.getItems().map((i) => `${i.getQuantity()}× ${i.getProductName()}`).join(', '),
      total: order.getTotal(),
      payment: `${METHOD_LABEL[order.getPayment().getMethod()]} (${order.getPayment().isPaid() ? 'paid' : 'on receipt'})`,
      receivedAt: new Date().toLocaleTimeString('en-GB'),
    });
    return posOrderId;
  }

  /** Used before retrying, so a timeout never creates a duplicate order (NFR-03). */
  findOrder(orderNumber: string): string | null {
    return this.received.get(orderNumber)?.posOrderId ?? null;
  }

  getReceivedOrders(): PosOrderRecord[] { return [...this.received.values()].reverse(); }
  reset(): void { this.received.clear(); }
  private getToken(): string { return `token-for-${this.apiLogin}`; }
}

/** Builds a Yandex Maps link for the courier group (FR-03). */
export class YandexGeocoder {
  constructor(private apiKey: string = process.env.YANDEX_API_KEY ?? '') {}
  getMapLink(address: string): string {
    return `https://yandex.uz/maps/?text=${encodeURIComponent(address + ', Tashkent')}`;
  }
  linkFor(delivery: Delivery): string {
    const link = this.getMapLink(delivery.getAddress());
    delivery.setMapLink(link);
    return link;
  }
}
