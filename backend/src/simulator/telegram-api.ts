// Stand-in for the external Telegram Bot API. It stores the messages of the
// customer chat and the two private staff groups so the React UI can show them.

export interface Button { label: string; action: string; }
export interface ChatMessage {
  id: number;
  from: 'bot' | 'user';
  text: string;
  buttons?: Button[][];
  link?: { label: string; url: string };
  time: string;
}

export const CHAT = {
  CUSTOMER: 'customer',
  OPERATORS: 'operators',
  COURIERS: 'couriers',
} as const;

export class TelegramApi {
  private chats = new Map<string, ChatMessage[]>();
  private seq = 0;

  sendMessage(chatId: string, text: string, opts: { buttons?: Button[][]; link?: ChatMessage['link'] } = {}): void {
    this.push(chatId, { from: 'bot', text, ...opts });
  }
  userMessage(chatId: string, text: string): void {
    this.push(chatId, { from: 'user', text });
  }
  getChat(chatId: string): ChatMessage[] { return this.chats.get(chatId) ?? []; }
  reset(): void { this.chats.clear(); }

  private push(chatId: string, m: Omit<ChatMessage, 'id' | 'time'>): void {
    const list = this.chats.get(chatId) ?? [];
    list.push({ ...m, id: ++this.seq, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) });
    this.chats.set(chatId, list);
  }
}
