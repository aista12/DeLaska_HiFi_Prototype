// NestJS HTTP endpoints used by the React simulator. They forward to ChatController,
// exactly as a Telegram webhook would forward real updates.
import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import type { Bot } from '../bootstrap';
import { CHAT } from './telegram-api';

@Controller('api')
export class SimulatorController {
  constructor(@Inject('BOT') private readonly bot: Bot) {}

  @Get('state')
  state() {
    return this.bot.state();
  }

  @Post('start')
  start() {
    this.bot.chat.onStart(CHAT.CUSTOMER);
    return this.bot.state();
  }

  @Post('button')
  button(@Body() body: { action: string; label: string }) {
    this.bot.chat.onButton(CHAT.CUSTOMER, body.action, body.label);
    return this.bot.state();
  }

  @Post('text')
  text(@Body() body: { text: string }) {
    this.bot.chat.onText(CHAT.CUSTOMER, body.text);
    return this.bot.state();
  }

  @Post('reset')
  reset() {
    this.bot.reset();
    return this.bot.state();
  }
}
