import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class TrackingService {
  constructor(private prisma: PrismaService) {}

  async trackOpen(token: string, ip: string, userAgent: string) {
    const emailSend = await this.prisma.emailSend.findUnique({ where: { token } });
    if (!emailSend || emailSend.openedAt) return;

    await this.prisma.emailSend.update({
      where: { token },
      data: { openedAt: new Date() },
    });

    await this.prisma.contactEvent.create({
      data: {
        contactId: emailSend.contactId,
        campaignId: emailSend.campaignId ?? undefined,
        type: 'OPENED',
        ipHash: this.hashIp(ip),
        userAgent,
        metadata: { token },
      },
    });

    await this.prisma.contact.update({
      where: { id: emailSend.contactId },
      data: { lastOpenAt: new Date() },
    });

    if (emailSend.campaignId) {
      await this.prisma.campaignStat.upsert({
        where: { campaignId: emailSend.campaignId },
        create: { campaignId: emailSend.campaignId, opened: 1, uniqueOpened: 1 },
        update: {
          opened: { increment: 1 },
          uniqueOpened: { increment: 1 },
        },
      });
    }
  }

  async trackClick(token: string, url: string, ip: string, userAgent: string) {
    const emailSend = await this.prisma.emailSend.findUnique({ where: { token } });
    if (!emailSend) return null;

    if (!emailSend.clickedAt) {
      await this.prisma.emailSend.update({
        where: { token },
        data: { clickedAt: new Date() },
      });
    }

    await this.prisma.contactEvent.create({
      data: {
        contactId: emailSend.contactId,
        campaignId: emailSend.campaignId ?? undefined,
        type: 'CLICKED',
        ipHash: this.hashIp(ip),
        userAgent,
        metadata: { token, url },
      },
    });

    await this.prisma.contact.update({
      where: { id: emailSend.contactId },
      data: { lastClickAt: new Date() },
    });

    if (emailSend.campaignId) {
      await this.prisma.campaignStat.upsert({
        where: { campaignId: emailSend.campaignId },
        create: { campaignId: emailSend.campaignId, clicked: 1, uniqueClicked: 1 },
        update: {
          clicked: { increment: 1 },
          uniqueClicked: { increment: 1 },
        },
      });
    }

    return url;
  }

  async trackBounce(payload: any) {
    const messageId = payload?.mail?.messageId;
    if (!messageId) return;

    const notifications = payload?.bounce?.bouncedRecipients ?? [];
    for (const r of notifications) {
      const email = r.emailAddress;
      if (!email) continue;

      const contacts = await this.prisma.contact.findMany({
        where: { email, status: 'ACTIVE' },
      });

      for (const contact of contacts) {
        await this.prisma.contact.update({
          where: { id: contact.id },
          data: { status: 'BOUNCED' },
        });

        await this.prisma.contactEvent.create({
          data: {
            contactId: contact.id,
            type: 'BOUNCED',
            metadata: { messageId, reason: r.diagnosticCode },
          },
        });
      }
    }
  }

  async trackComplaint(payload: any) {
    const complainedRecipients = payload?.complaint?.complainedRecipients ?? [];
    for (const r of complainedRecipients) {
      const email = r.emailAddress;
      if (!email) continue;

      const contacts = await this.prisma.contact.findMany({
        where: { email, status: 'ACTIVE' },
      });

      for (const contact of contacts) {
        await this.prisma.contact.update({
          where: { id: contact.id },
          data: { status: 'SPAM_COMPLAINT' },
        });

        await this.prisma.contactEvent.create({
          data: {
            contactId: contact.id,
            type: 'SPAM_COMPLAINT',
            metadata: {},
          },
        });
      }
    }
  }

  async trackUnsubscribe(token: string) {
    const emailSend = await this.prisma.emailSend.findUnique({ where: { token } });
    if (!emailSend) return;

    await this.prisma.contact.update({
      where: { id: emailSend.contactId },
      data: { status: 'UNSUBSCRIBED' },
    });

    await this.prisma.contactEvent.create({
      data: {
        contactId: emailSend.contactId,
        campaignId: emailSend.campaignId ?? undefined,
        type: 'UNSUBSCRIBED',
        metadata: { token },
      },
    });

    if (emailSend.campaignId) {
      await this.prisma.campaignStat.upsert({
        where: { campaignId: emailSend.campaignId },
        create: { campaignId: emailSend.campaignId, unsubscribed: 1 },
        update: { unsubscribed: { increment: 1 } },
      });
    }
  }

  async recordConversion(organizationId: string, email: string, revenue: number, orderId?: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { email, organizationId, status: 'ACTIVE' },
    });
    if (!contact) return null;

    const window = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentClick = await this.prisma.contactEvent.findFirst({
      where: {
        contactId: contact.id,
        type: 'CLICKED',
        createdAt: { gt: window },
      },
      orderBy: { createdAt: 'desc' },
    });

    const metadata = (recentClick?.metadata as any) ?? {};
    const campaignId = recentClick?.campaignId ?? undefined;

    const conversion = await this.prisma.conversion.create({
      data: {
        organizationId,
        contactId: contact.id,
        campaignId,
        orderId,
        revenue,
      },
    });

    await this.prisma.contact.update({
      where: { id: contact.id },
      data: { revenue: { increment: revenue } },
    });

    if (campaignId) {
      await this.prisma.campaignStat.upsert({
        where: { campaignId },
        create: { campaignId, revenue },
        update: { revenue: { increment: revenue } },
      });
    }

    return { success: true, data: conversion };
  }

  private hashIp(ip: string): string {
    return createHash('sha256').update(ip + process.env.JWT_SECRET).digest('hex').substring(0, 16);
  }
}
