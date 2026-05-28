import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { SesService } from '../../shared/ses/ses.service';
import type { EmailJob } from './sending.service';
import { EMAIL_SEND_QUEUE } from '../../shared/redis/bull.module';

@Injectable()
export class EmailWorker implements OnModuleInit {
  private worker: Worker | null = null;

  constructor(
    private prisma: PrismaService,
    private ses: SesService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');

    this.worker = new Worker<EmailJob>(
      EMAIL_SEND_QUEUE,
      async (job: Job<EmailJob>) => {
        await this.processEmail(job.data);
      },
      {
        connection: { url: redisUrl },
        concurrency: 50,
        limiter: { max: 14, duration: 1000 },
      },
    );

    this.worker.on('failed', (job, err) => {
      console.error(`Email job ${job?.id} falhou: ${err.message}`);
    });

    console.log('Email worker iniciado');
  }

  private async processEmail(job: EmailJob) {
    const headers: Record<string, string> = {
      'List-Unsubscribe': `<mailto:unsub@mailmaxpro.com?subject=unsub>, <${this.config.get('TRACKING_URL')}/track/unsub/${job.unsubscribeToken}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'X-Mailer': 'MailMaxPro/1.0',
    };

    await this.ses.sendEmail({
      to: job.email,
      from: job.fromEmail,
      fromName: job.fromName,
      subject: job.subject,
      html: job.html,
      headers,
    });

    await this.prisma.emailSend.updateMany({
      where: { token: job.trackingToken },
      data: { sentAt: new Date() },
    });

    await this.prisma.campaignStat.upsert({
      where: { campaignId: job.campaignId },
      create: { campaignId: job.campaignId, sent: 1 },
      update: { sent: { increment: 1 } },
    });

    await this.prisma.contactEvent.create({
      data: {
        contactId: job.contactId,
        campaignId: job.campaignId,
        type: 'SENT',
        metadata: { token: job.trackingToken },
      },
    });
  }
}
