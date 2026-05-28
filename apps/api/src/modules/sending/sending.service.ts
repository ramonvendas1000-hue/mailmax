import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../shared/prisma/prisma.service';

export interface EmailJob {
  campaignId: string;
  contactId: string;
  email: string;
  name: string | null;
  subject: string;
  html: string;
  fromEmail: string;
  fromName: string;
  trackingToken: string;
  organizationId: string;
  unsubscribeToken: string;
}

@Injectable()
export class SendingService {
  constructor(
    @Inject('EMAIL_QUEUE') private emailQueue: Queue,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async enqueueCampaign(campaignId: string): Promise<number> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        template: true,
        lists: { include: { list: { include: { contacts: { include: { contact: true } } } } } },
      },
    });

    if (!campaign || !campaign.template) return 0;

    const contactsMap = new Map<string, any>();

    for (const cl of campaign.lists) {
      for (const lc of cl.list.contacts) {
        const c = lc.contact;
        if (c.status === 'ACTIVE' && !contactsMap.has(c.id)) {
          contactsMap.set(c.id, c);
        }
      }
    }

    const trackingUrl = this.config.get<string>('TRACKING_URL', 'http://localhost:3001');
    let enqueued = 0;

    for (const contact of contactsMap.values()) {
      const emailSend = await this.prisma.emailSend.create({
        data: {
          campaignId,
          contactId: contact.id,
        },
      });

      const html = this.injectTracking(
        campaign.template!.htmlContent,
        emailSend.token,
        trackingUrl,
        contact,
        campaign.organizationId,
      );

      const job: EmailJob = {
        campaignId,
        contactId: contact.id,
        email: contact.email,
        name: contact.name,
        subject: campaign.subject,
        html,
        fromEmail: campaign.fromEmail,
        fromName: campaign.fromName,
        trackingToken: emailSend.token,
        organizationId: campaign.organizationId,
        unsubscribeToken: emailSend.token,
      };

      await this.emailQueue.add(`email:${emailSend.token}`, job, {
        jobId: emailSend.token,
      });

      enqueued++;
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING', sentAt: new Date() },
    });

    return enqueued;
  }

  private injectTracking(
    html: string,
    token: string,
    trackingUrl: string,
    contact: any,
    organizationId: string,
  ): string {
    const openPixel = `<img src="${trackingUrl}/track/open/${token}" width="1" height="1" alt="" style="display:none" />`;

    let result = html
      .replace(/\{\{contact\.name\}\}/g, contact.name ?? '')
      .replace(/\{\{contact\.email\}\}/g, contact.email)
      .replace(/\{\{unsubscribe_link\}\}/g, `${trackingUrl}/track/unsub/${token}`)
      .replace(/\{\{view_in_browser_link\}\}/g, `${trackingUrl}/track/view/${token}`);

    result = result.replace(
      /href="(https?:\/\/[^"]+)"/g,
      (match, url) => {
        if (url.includes(trackingUrl)) return match;
        const encoded = encodeURIComponent(url);
        return `href="${trackingUrl}/track/click/${token}?url=${encoded}"`;
      },
    );

    result = result.replace('</body>', `${openPixel}</body>`);

    return result;
  }
}
