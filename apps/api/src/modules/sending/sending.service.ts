import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { SesService } from '../../shared/ses/ses.service';

@Injectable()
export class SendingService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private ses: SesService,
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

    // Build unique active contacts from all selected lists
    const contactsMap = new Map<string, any>();
    for (const cl of campaign.lists) {
      for (const lc of cl.list.contacts) {
        const c = lc.contact;
        if (c.status === 'ACTIVE' && !contactsMap.has(c.id)) {
          contactsMap.set(c.id, c);
        }
      }
    }

    if (contactsMap.size === 0) return 0;

    const trackingUrl = this.config.get<string>('TRACKING_URL', 'https://mailmax-api.onrender.com');
    let sent = 0;

    // Mark campaign as sending
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING', sentAt: new Date() },
    });

    // Send directly to each contact
    for (const contact of contactsMap.values()) {
      try {
        const emailSend = await this.prisma.emailSend.create({
          data: { campaignId, contactId: contact.id },
        });

        const html = this.injectTracking(
          campaign.template!.htmlContent,
          emailSend.token,
          trackingUrl,
          contact,
          campaign.organizationId,
        );

        await this.ses.sendEmail({
          to: contact.email,
          from: campaign.fromEmail,
          fromName: campaign.fromName,
          subject: campaign.subject,
          html,
        });

        await this.prisma.emailSend.update({
          where: { id: emailSend.id },
          data: { sentAt: new Date() },
        });

        await this.prisma.campaignStat.upsert({
          where: { campaignId },
          create: { campaignId, sent: 1 },
          update: { sent: { increment: 1 } },
        });

        await this.prisma.contactEvent.create({
          data: {
            contactId: contact.id,
            campaignId,
            type: 'SENT',
            metadata: { token: emailSend.token },
          },
        });

        sent++;
      } catch (err) {
        console.error(`[Sending] Erro ao enviar para ${contact.email}:`, (err as Error).message);
      }
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: sent > 0 ? 'SENT' : 'DRAFT' },
    });

    return sent;
  }

  private injectTracking(html: string, token: string, trackingUrl: string, contact: any, _orgId: string): string {
    const openPixel = `<img src="${trackingUrl}/track/open/${token}" width="1" height="1" alt="" style="display:none" />`;

    let result = html
      .replace(/\{\{contact\.name\}\}/g, contact.name ?? contact.email)
      .replace(/\{\{contact\.email\}\}/g, contact.email)
      .replace(/\{\{unsubscribe_link\}\}/g, `${trackingUrl}/track/unsub/${token}`)
      .replace(/\{\{view_in_browser_link\}\}/g, `${trackingUrl}/track/view/${token}`);

    result = result.replace(
      /href="(https?:\/\/[^"]+)"/g,
      (match, url) => {
        if (url.includes(trackingUrl)) return match;
        return `href="${trackingUrl}/track/click/${token}?url=${encodeURIComponent(url)}"`;
      },
    );

    if (result.includes('</body>')) {
      result = result.replace('</body>', `${openPixel}</body>`);
    } else {
      result += openPixel;
    }

    return result;
  }
}
