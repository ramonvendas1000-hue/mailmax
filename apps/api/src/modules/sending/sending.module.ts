import { Module } from '@nestjs/common';
import { SendingService } from './sending.service';
import { SesModule } from '../../shared/ses/ses.module';

@Module({
  imports: [SesModule],
  providers: [SendingService],
  exports: [SendingService],
})
export class SendingModule {}
