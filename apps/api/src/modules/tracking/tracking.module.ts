import { Module } from '@nestjs/common';
import { TrackingController, ConversionsController } from './tracking.controller';
import { TrackingService } from './tracking.service';

@Module({
  controllers: [TrackingController, ConversionsController],
  providers: [TrackingService],
})
export class TrackingModule {}
