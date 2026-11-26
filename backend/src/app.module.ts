import { Module } from '@nestjs/common';
import { createBot } from './bootstrap';
import { SimulatorController } from './simulator/simulator.controller';

@Module({
  controllers: [SimulatorController],
  providers: [{ provide: 'BOT', useFactory: createBot }],
})
export class AppModule {}
