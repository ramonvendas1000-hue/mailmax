import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { FollowupService } from './followup.service';

@Injectable()
export class FollowupWorker implements OnModuleInit, OnModuleDestroy {
  private interval: NodeJS.Timeout;

  constructor(private followupService: FollowupService) {}

  onModuleInit() {
    // Run every 5 minutes
    this.interval = setInterval(() => this.followupService.processFollowups(), 5 * 60 * 1000);
    console.log('Follow-up worker iniciado (intervalo: 5min)');
  }

  onModuleDestroy() {
    clearInterval(this.interval);
  }
}
