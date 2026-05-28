import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';

export const EMAIL_SEND_QUEUE = 'email-send-queue';
export const AUTOMATION_QUEUE = 'automation-queue';

@Module({
  providers: [
    {
      provide: 'EMAIL_QUEUE',
      useFactory: (config: ConfigService) => {
        return new Queue(EMAIL_SEND_QUEUE, {
          connection: { url: config.get<string>('REDIS_URL', 'redis://localhost:6379') },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 60000 },
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 500 },
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'AUTOMATION_QUEUE',
      useFactory: (config: ConfigService) => {
        return new Queue(AUTOMATION_QUEUE, {
          connection: { url: config.get<string>('REDIS_URL', 'redis://localhost:6379') },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['EMAIL_QUEUE', 'AUTOMATION_QUEUE'],
})
export class BullModule {}
