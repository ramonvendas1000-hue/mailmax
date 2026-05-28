import { Module } from '@nestjs/common';
import { SendingService } from './sending.service';
import { EmailWorker } from './email.worker';

@Module({
  imports: [],
  providers: [SendingService, EmailWorker],
  exports: [SendingService],
})
export class SendingModule {}
