// Package: bot.ui (presentation layer) - turns domain objects into Telegram texts and keyboards.
import { Branch, Cart, Category, Delivery, Order, Product } from '../ordering/models';
import { METHOD_LABEL, PaymentMethod } from '../payments/payment';
import type { Button } from '../simulator/telegram-api';
import type { CheckoutDraft } from './chat-session';

export const formatMoney = (n: number) => `${n.toLocaleString('en-US').replace(/,/g, ' ')} UZS`;

export class MessageFormatter {
  mainMenu(): Button[][] {
    return [[{ label: '🛍 Menu', action: 'menu' }, { label: '🛒 Cart', action: 'cart' }]];
  }

  menuKeyboard(categories: Category[]): Button[][] {
    return [
      ...categories.map((c) => [{ label: c.getName(), action: `cat:${c.getId()}` }]),
      [{ label: '🛒 Cart', action: 'cart' }],
    ];
  }

  productsKeyboard(category: Category): Button[][] {
    return [
      ...category.getProducts().map((p) => [
        {
          label: p.isAvailable() ? `${p.getName()} · ${formatMoney(p.getPrice())}` : `${p.getName()} · sold out`,
          action: p.isAvailable() ? `prod:${p.getId()}` : 'noop',
        },
      ]),
      [{ label: '⬅ Back', action: 'menu' }, { label: '🛒 Cart', action: 'cart' }],
    ];
  }

  productCard(p: Product): string {
    return `${p.getName()}\n${p.getDescription()}\n\nPrice: ${formatMoney(p.getPrice())}`;
  }

  cartMessage(cart: Cart): string {
    if (cart.isEmpty()) return '🛒 Your cart is empty.';
    const lines = cart.getItems().map(
      (i) => `${i.getQuantity()} × ${i.getProduct().getName()} — ${formatMoney(i.getSubtotal())}`,
    );
    return `🛒 Your cart\n\n${lines.join('\n')}\n\nTotal: ${formatMoney(cart.getTotal())}`;
  }

  cartKeyboard(cart: Cart): Button[][] {
    if (cart.isEmpty()) return [[{ label: '🛍 Menu', action: 'menu' }]];
    return [
      ...cart.getItems().map((i) => [
        { label: '➖', action: `dec:${i.getProduct().getId()}` },
        { label: `${i.getProduct().getName()} (${i.getQuantity()})`, action: 'noop' },
        { label: '➕', action: `inc:${i.getProduct().getId()}` },
      ]),
      [{ label: '🛍 Add more', action: 'menu' }, { label: '🧹 Clear', action: 'clear' }],
      [{ label: '✅ Checkout', action: 'checkout' }],
    ];
  }

  branchKeyboard(branches: Branch[]): Button[][] {
    return branches.map((b) => [{ label: `📍 ${b.getName()}`, action: `branch:${b.getId()}` }]);
  }

  paymentKeyboard(): Button[][] {
    return [
      [{ label: 'Click', action: `pay:${PaymentMethod.CLICK}` }, { label: 'Payme', action: `pay:${PaymentMethod.PAYME}` }],
      [{ label: 'Cash', action: `pay:${PaymentMethod.CASH}` }, { label: 'Card (terminal)', action: `pay:${PaymentMethod.CARD_TERMINAL}` }],
    ];
  }

  checkoutSummary(cart: Cart, d: CheckoutDraft, branch: Branch): string {
    const lines = cart.getItems().map((i) => `${i.getQuantity()} × ${i.getProduct().getName()} — ${formatMoney(i.getSubtotal())}`);
    return [
      '📋 Please check your order',
      '',
      ...lines,
      `Total: ${formatMoney(cart.getTotal())}`,
      '',
      `${d.type === 'delivery' ? '🚚 Delivery' : '🏃 Pickup'} · ${branch.getName()}`,
      ...(d.type === 'delivery' ? [`Address: ${d.address}`] : []),
      `Phone: ${d.phone}`,
      `Comment: ${d.comment || '—'}`,
      `Payment: ${METHOD_LABEL[d.method!]}`,
    ].join('\n');
  }

  orderConfirmed(order: Order): string {
    const f = order.getFulfilment();
    const when = f instanceof Delivery ? 'A courier will bring it to you soon.' : `Pick it up at ${f.getBranch().getName()}.`;
    return `🎉 Order #${order.getOrderNumber()} is confirmed and has been sent to the kitchen.\n${when}\n\nTotal: ${formatMoney(order.getTotal())}`;
  }
}
