// Package: bot.ui - handles Telegram updates (button taps and typed text) for each customer chat.
import { Branch, Cart, Customer, Delivery, Fulfilment, Pickup } from '../ordering/models';
import { MenuService, OrderService } from '../ordering/services';
import { PaymentMethod } from '../payments/payment';
import { TelegramApi } from '../simulator/telegram-api';
import { ChatSession, CheckoutStep } from './chat-session';
import { MessageFormatter } from './message-formatter';

const DEMO_CONTACT = '+998 90 123 45 67'; // what Telegram's "Share contact" button would send

export class ChatController {
  private sessions = new Map<string, ChatSession>();
  private customers = new Map<string, Customer>();
  private carts = new Map<string, Cart>();

  constructor(
    private menuService: MenuService,
    private orderService: OrderService,
    private formatter: MessageFormatter,
    private telegram: TelegramApi,
    private branches: Branch[],
  ) {}

  onStart(chatId: string, name = 'Anna Nielsen'): void {
    this.customers.set(chatId, new Customer(1001, name));
    this.carts.set(chatId, new Cart());
    this.session(chatId).reset();
    this.telegram.userMessage(chatId, '/start');
    this.say(chatId, `Welcome to De'laska, ${name}! 🥐\nFresh croissants and desserts from our Tashkent bakeries.\nWhat would you like to do?`, this.formatter.mainMenu());
  }

  onButton(chatId: string, action: string, label: string): void {
    if (action === 'noop') return;
    this.telegram.userMessage(chatId, label);
    const [cmd, arg] = action.split(':');
    const cart = this.cart(chatId);
    const session = this.session(chatId);
    const draft = session.getDraft();

    switch (cmd) {
      case 'menu':
        return this.say(chatId, '🛍 Choose a category:', this.formatter.menuKeyboard(this.menuService.getCategories()));
      case 'cat': {
        const category = this.menuService.getCategories().find((c) => c.getId() === arg)!;
        return this.say(chatId, `${category.getName()} — tap a product:`, this.formatter.productsKeyboard(category));
      }
      case 'prod': {
        const p = this.menuService.findProduct(arg)!;
        const cat = this.menuService.findCategoryOf(arg)!;
        return this.say(chatId, this.formatter.productCard(p), [
          [{ label: '➕ Add to cart', action: `add:${p.getId()}` }],
          [{ label: '⬅ Back', action: `cat:${cat.getId()}` }],
        ]);
      }
      case 'add': {
        const p = this.menuService.findProduct(arg)!;
        cart.addItem(p, 1);
        const cat = this.menuService.findCategoryOf(arg)!;
        return this.say(chatId, `✅ ${p.getName()} added to your cart.`, [
          [{ label: '🛍 Continue shopping', action: `cat:${cat.getId()}` }, { label: `🛒 Cart (${cart.getCount()})`, action: 'cart' }],
        ]);
      }
      case 'inc':
      case 'dec': {
        const item = cart.getItems().find((i) => i.getProduct().getId() === arg);
        if (item) cart.changeQty(arg, item.getQuantity() + (cmd === 'inc' ? 1 : -1));
        return this.showCart(chatId);
      }
      case 'clear':
        cart.clear();
        return this.showCart(chatId);
      case 'cart':
        return this.showCart(chatId);
      case 'checkout':
        if (cart.isEmpty()) return this.say(chatId, '⚠️ Your cart is empty. Add something first.', this.formatter.mainMenu());
        session.goTo(CheckoutStep.FULFILMENT);
        return this.say(chatId, 'How would you like to receive your order?', [
          [{ label: '🏃 Pickup', action: 'ful:pickup' }, { label: '🚚 Delivery', action: 'ful:delivery' }],
        ]);
      case 'ful':
        draft.type = arg as 'pickup' | 'delivery';
        session.goTo(CheckoutStep.BRANCH);
        return this.say(chatId, draft.type === 'pickup' ? 'Which branch will you pick up from?' : 'Which branch should deliver your order?',
          this.formatter.branchKeyboard(this.branches));
      case 'branch':
        draft.branchId = arg;
        if (draft.type === 'delivery') {
          session.goTo(CheckoutStep.ADDRESS);
          return this.say(chatId, '📍 Please type your delivery address (street, house, apartment):');
        }
        return this.askPhone(chatId);
      case 'phone':
        return this.handlePhone(chatId, DEMO_CONTACT);
      case 'skip':
        draft.comment = '';
        return this.askPayment(chatId);
      case 'pay':
        draft.method = arg as PaymentMethod;
        session.goTo(CheckoutStep.SUMMARY);
        return this.say(chatId, this.formatter.checkoutSummary(cart, draft, this.branch(draft.branchId!)), [
          [{ label: '✅ Confirm order', action: 'confirm' }, { label: '❌ Cancel', action: 'cancel' }],
        ]);
      case 'confirm':
        return this.confirm(chatId);
      case 'cancel':
        session.reset();
        return this.say(chatId, 'Checkout cancelled. Your cart is still saved.', this.formatter.mainMenu());
    }
  }

  onText(chatId: string, text: string): void {
    this.telegram.userMessage(chatId, text);
    const session = this.session(chatId);
    const draft = session.getDraft();
    switch (session.getStep()) {
      case CheckoutStep.ADDRESS:
        if (text.trim().length < 5) return this.say(chatId, '⚠️ The address looks too short. Please type the full address:');
        draft.address = text.trim();
        return this.askPhone(chatId);
      case CheckoutStep.PHONE:
        return this.handlePhone(chatId, text);
      case CheckoutStep.COMMENT:
        draft.comment = text.trim();
        return this.askPayment(chatId);
      default:
        return this.say(chatId, 'Please use the buttons below 👇', this.formatter.mainMenu());
    }
  }

  // ---------- helpers ----------
  private askPhone(chatId: string): void {
    this.session(chatId).goTo(CheckoutStep.PHONE);
    this.say(chatId, '📱 Please share your phone number so we can contact you.', [
      [{ label: '📱 Share my phone number', action: 'phone' }],
    ]);
  }

  private handlePhone(chatId: string, phone: string): void {
    const customer = this.customers.get(chatId)!;
    if (!customer.setPhone(phone)) {
      return this.say(chatId, '⚠️ That phone number is not valid. Use the format +998 90 123 45 67.');
    }
    this.session(chatId).getDraft().phone = customer.getPhone();
    this.session(chatId).goTo(CheckoutStep.COMMENT);
    this.say(chatId, '💬 Any comment for the kitchen or courier? Type it, or tap Skip.', [[{ label: 'Skip', action: 'skip' }]]);
  }

  private askPayment(chatId: string): void {
    this.session(chatId).goTo(CheckoutStep.PAYMENT);
    this.say(chatId, '💳 How would you like to pay?', this.formatter.paymentKeyboard());
  }

  private confirm(chatId: string): void {
    const session = this.session(chatId);
    const d = session.getDraft();
    const cart = this.cart(chatId);
    const branch = this.branch(d.branchId!);
    const fulfilment: Fulfilment = d.type === 'delivery' ? new Delivery(branch, d.address!) : new Pickup(branch);
    try {
      const order = this.orderService.checkout(this.customers.get(chatId)!, cart, fulfilment, d.method!, d.comment);
      if (order.getPayment().isPaid()) {
        this.say(chatId, `💳 Payment received via ${d.method === PaymentMethod.CLICK ? 'Click' : 'Payme'} ✅\nTransaction: ${order.getPayment().getTransactionId()}`);
      }
      this.say(chatId, this.formatter.orderConfirmed(order), this.formatter.mainMenu());
      cart.clear();
      session.reset();
    } catch (e) {
      this.say(chatId, `⚠️ ${(e as Error).message}`, this.formatter.mainMenu());
    }
  }

  private showCart(chatId: string): void {
    const cart = this.cart(chatId);
    this.say(chatId, this.formatter.cartMessage(cart), this.formatter.cartKeyboard(cart));
  }

  private say(chatId: string, text: string, buttons?: { label: string; action: string }[][]): void {
    this.telegram.sendMessage(chatId, text, { buttons });
  }

  private session(chatId: string): ChatSession {
    if (!this.sessions.has(chatId)) this.sessions.set(chatId, new ChatSession(chatId));
    return this.sessions.get(chatId)!;
  }
  private cart(chatId: string): Cart {
    if (!this.carts.has(chatId)) this.carts.set(chatId, new Cart());
    return this.carts.get(chatId)!;
  }
  private branch(id: string): Branch {
    return this.branches.find((b) => b.getId() === id)!;
  }
}
