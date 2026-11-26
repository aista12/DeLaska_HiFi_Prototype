// Composition root: wires the layers together (see the architecture diagram).
import { Branch } from './ordering/models';
import { MenuService, OrderService } from './ordering/services';
import { PaymentFactory } from './payments/payment';
import { IikoClient, YandexGeocoder } from './integrations/integrations';
import { ErrorLog, OrderRepository } from './persistence/persistence';
import { CourierNotifier, EventBus, OperatorNotifier, RetryPolicy } from './notifications/notifications';
import { ChatController } from './bot-ui/chat-controller';
import { MessageFormatter } from './bot-ui/message-formatter';
import { CHAT, TelegramApi } from './simulator/telegram-api';

export function createBot() {
  const telegram = new TelegramApi();          // simulated Telegram Bot API
  const iiko = new IikoClient();               // simulated iiko Cloud API (implements PosSystem)
  const errorLog = new ErrorLog();
  const repository = new OrderRepository();
  const eventBus = new EventBus();

  eventBus.subscribe(new OperatorNotifier(CHAT.OPERATORS, telegram, new RetryPolicy(errorLog)));
  eventBus.subscribe(new CourierNotifier(CHAT.COURIERS, telegram, new RetryPolicy(errorLog), new YandexGeocoder()));

  const menuService = new MenuService(iiko);
  const orderService = new OrderService(iiko, new PaymentFactory(), repository, eventBus, errorLog);

  const branches = [
    new Branch('b1', "De'laska Yunusabad", 'Yunusabad district'),
    new Branch('b2', "De'laska Chilanzar", 'Chilanzar district'),
    new Branch('b3', "De'laska Mirzo Ulugbek", 'Mirzo Ulugbek district'),
  ];
  const chat = new ChatController(menuService, orderService, new MessageFormatter(), telegram, branches);

  return {
    chat,
    state: () => ({
      customer: telegram.getChat(CHAT.CUSTOMER),
      operators: telegram.getChat(CHAT.OPERATORS),
      couriers: telegram.getChat(CHAT.COURIERS),
      iikoOrders: iiko.getReceivedOrders(),
    }),
    reset: () => { telegram.reset(); iiko.reset(); repository.reset(); },
  };
}

export type Bot = ReturnType<typeof createBot>;
