# De'laska Telegram Ordering Bot – High-Fidelity Prototype

Student ID: 00017520 · Module: Systems Analysis and Design (6BUIS026C) · Coursework 2

A working prototype of the De'laska Telegram ordering bot (Coursework 1 case).
The screen shows, side by side:

1. **Customer · Telegram**: the customer chats with the bot. They browse the menu, manage the cart, choose pickup or delivery and a branch, share a phone number, add a comment, pay and confirm.
2. **Staff · private Telegram groups**: the **Operators** group gets every new order. The **Couriers** group gets delivery orders with a Yandex Maps link.
3. **iiko POS**: the order shows up in iiko automatically, with no manual re-typing.

The Telegram Bot API, the iiko Cloud API and Click/Payme are **simulated** so the prototype runs offline.
Everything else is real application code.

## Run it (Node.js 18+)

```bash
npm install      # installs root, backend and frontend packages
npm start        # starts the NestJS API (port 3001) and the React UI (port 5173)
```

The browser opens at http://localhost:5173. **Reset demo** (top right) clears all chats.

## Code structure (matches the UML class diagrams)

```
backend/src/
  bot-ui/          Presentation layer: ChatController, ChatSession, MessageFormatter
  ordering/        Business layer: Customer, Cart, CartItem, Product, Category, Branch,
                   Order, OrderItem, Fulfilment (abstract), Pickup, Delivery, OrderStatus,
                   MenuService, OrderService
  payments/        PaymentProvider (interface), ClickProvider, PaymeProvider, CashProvider,
                   PaymentFactory, Payment, PaymentMethod
  notifications/   EventBus, OrderRegisteredEvent, Notifier (interface),
                   OperatorNotifier, CourierNotifier, RetryPolicy (3 attempts, 30 s)
  integrations/    PosSystem (interface), IikoClient, YandexGeocoder
  persistence/     OrderRepository, ErrorLog
  simulator/       TelegramApi stand-in + NestJS SimulatorController (HTTP endpoints)
  bootstrap.ts     wires the layers together
frontend/src/      React UI (Telegram look-alike phone, staff groups, iiko panel)
```

## 1-minute screencast script

| Time | Action |
|------|--------|
| 0:00–0:05 | Show the three panels: customer, staff groups, iiko |
| 0:05–0:20 | START → Menu → Croissants → Almond croissant → Add to cart → Continue shopping → Pistachio → Add |
| 0:20–0:28 | Cart → ➕ (quantity changes, total updates) → Checkout |
| 0:28–0:45 | Delivery → Yunusabad → type an address → Share my phone number → type a comment → Click |
| 0:45–0:52 | Read the summary → Confirm order → payment received + order number |
| 0:52–1:00 | Point at the Operators group, the Couriers group (Yandex Maps link) and the order in iiko |
