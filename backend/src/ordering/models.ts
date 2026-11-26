// Package: ordering (business layer) - domain classes from Class diagram A.
import { Payment } from '../payments/payment';

export enum OrderStatus {
  NEW = 'NEW',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  PAID = 'PAID',
  REGISTERED = 'REGISTERED',
  FAILED = 'FAILED',
}

export class Product {
  constructor(
    private productId: string,
    private name: string,
    private price: number,
    private available: boolean = true,
    private description: string = '',
  ) {}
  getId(): string { return this.productId; }
  getName(): string { return this.name; }
  getPrice(): number { return this.price; }
  getDescription(): string { return this.description; }
  isAvailable(): boolean { return this.available; }
}

export class Category {
  constructor(private categoryId: string, private name: string, private products: Product[] = []) {}
  getId(): string { return this.categoryId; }
  getName(): string { return this.name; }
  getProducts(): Product[] { return this.products; }
  getAvailableProducts(): Product[] { return this.products.filter((p) => p.isAvailable()); }
}

export class Branch {
  constructor(private branchId: string, private name: string, private address: string, private isOpen = true) {}
  getId(): string { return this.branchId; }
  getName(): string { return this.name; }
  getAddress(): string { return this.address; }
  acceptsOrders(): boolean { return this.isOpen; }
}

export class Customer {
  constructor(private telegramId: number, private name: string, private phone: string = '') {}
  getTelegramId(): number { return this.telegramId; }
  getName(): string { return this.name; }
  getPhone(): string { return this.phone; }
  /** Encapsulation: the phone can only be set through validation (FR-03). */
  setPhone(phone: string): boolean {
    const clean = phone.replace(/[\s()-]/g, '');
    if (!/^\+?998\d{9}$/.test(clean)) return false;
    this.phone = clean.startsWith('+') ? clean : '+' + clean;
    return true;
  }
}

export class CartItem {
  constructor(private product: Product, private quantity: number) {}
  getProduct(): Product { return this.product; }
  getQuantity(): number { return this.quantity; }
  setQuantity(qty: number): void {
    if (qty < 1) throw new Error('Quantity must be at least 1');
    this.quantity = qty;
  }
  getSubtotal(): number { return this.product.getPrice() * this.quantity; }
}

/** Cart is composed of CartItems (composition): items never exist outside a cart. */
export class Cart {
  private items: CartItem[] = [];

  addItem(product: Product, qty: number = 1): void {
    if (!product.isAvailable()) throw new Error(`${product.getName()} is not available`);
    const existing = this.items.find((i) => i.getProduct().getId() === product.getId());
    if (existing) existing.setQuantity(existing.getQuantity() + qty);
    else this.items.push(new CartItem(product, qty));
  }
  changeQty(productId: string, qty: number): void {
    if (qty < 1) return this.removeItem(productId);
    this.items.find((i) => i.getProduct().getId() === productId)?.setQuantity(qty);
  }
  removeItem(productId: string): void {
    this.items = this.items.filter((i) => i.getProduct().getId() !== productId);
  }
  getItems(): CartItem[] { return [...this.items]; }
  getTotal(): number { return this.items.reduce((sum, i) => sum + i.getSubtotal(), 0); }
  getCount(): number { return this.items.reduce((sum, i) => sum + i.getQuantity(), 0); }
  isEmpty(): boolean { return this.items.length === 0; }
  clear(): void { this.items = []; }
}

/** Abstract parent of Pickup and Delivery (generalization). */
export abstract class Fulfilment {
  constructor(protected branch: Branch) {}
  getBranch(): Branch { return this.branch; }
  abstract getType(): string;
  abstract validate(): boolean;
}

export class Pickup extends Fulfilment {
  getType(): string { return 'Pickup'; }
  validate(): boolean { return this.branch.acceptsOrders(); }
}

export class Delivery extends Fulfilment {
  private mapLink = '';
  constructor(branch: Branch, private address: string) { super(branch); }
  getType(): string { return 'Delivery'; }
  validate(): boolean { return this.branch.acceptsOrders() && this.address.trim().length >= 5; }
  getAddress(): string { return this.address; }
  getMapLink(): string { return this.mapLink; }
  setMapLink(link: string): void { this.mapLink = link; }
}

export class OrderItem {
  constructor(private productName: string, private unitPrice: number, private quantity: number) {}
  getProductName(): string { return this.productName; }
  getUnitPrice(): number { return this.unitPrice; }
  getQuantity(): number { return this.quantity; }
  getSubtotal(): number { return this.unitPrice * this.quantity; }
}

/** Order is composed of OrderItems, one Fulfilment and one Payment. */
export class Order {
  private status: OrderStatus = OrderStatus.NEW;
  private posOrderId = '';
  private failReason = '';
  private createdAt = new Date();

  constructor(
    private orderNumber: string,
    private customer: Customer,
    private items: OrderItem[],
    private fulfilment: Fulfilment,
    private payment: Payment,
    private comment: string = '',
  ) {}

  getOrderNumber(): string { return this.orderNumber; }
  getCustomer(): Customer { return this.customer; }
  getItems(): OrderItem[] { return [...this.items]; }
  getFulfilment(): Fulfilment { return this.fulfilment; }
  getPayment(): Payment { return this.payment; }
  getComment(): string { return this.comment; }
  getCreatedAt(): Date { return this.createdAt; }
  getStatus(): OrderStatus { return this.status; }
  getPosOrderId(): string { return this.posOrderId; }
  getTotal(): number { return this.items.reduce((sum, i) => sum + i.getSubtotal(), 0); }

  markPaid(): void { this.status = OrderStatus.PAID; }
  markRegistered(posOrderId: string): void {
    this.posOrderId = posOrderId;
    this.status = OrderStatus.REGISTERED;
  }
  markFailed(reason: string): void {
    this.failReason = reason;
    this.status = OrderStatus.FAILED;
  }
}
