import { Module } from '@nestjs/common';
import { FollowupController } from './followup.controller';
import { FollowupService } from './followup.service';
import { FollowupWorker } from './followup.worker';

@Module({
  controllers: [FollowupController],
  providers: [FollowupService, FollowupWorker],
})
export class FollowupModule {}
