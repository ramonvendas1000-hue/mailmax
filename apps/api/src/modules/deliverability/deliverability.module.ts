import { Module } from '@nestjs/common';
import { DeliverabilityController } from './deliverability.controller';
import { DeliverabilityService } from './deliverability.service';

@Module({
  controllers: [DeliverabilityController],
  providers: [DeliverabilityService],
})
export class DeliverabilityModule {}
