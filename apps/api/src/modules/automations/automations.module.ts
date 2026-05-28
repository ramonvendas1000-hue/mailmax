import { Module } from '@nestjs/common';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutomationWorker } from './automation.worker';
import { SendingModule } from '../sending/sending.module';

@Module({
  imports: [SendingModule],
  controllers: [AutomationsController],
  providers: [AutomationsService, AutomationWorker],
  exports: [AutomationsService],
})
export class AutomationsModule {}
