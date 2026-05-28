import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(organizationId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalContacts, activeContacts, totalCampaigns, totalRevenue] = await Promise.all([
      this.prisma.contact.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.contact.count({ where: { organizationId, status: 'ACTIVE', deletedAt: null } }),
      this.prisma.campaign.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.conversion.aggregate({
        where: { organizationId, attributedAt: { gte: since } },
        _sum: { revenue: true },
      }),
    ]);

    const campaignStats = await this.prisma.campaignStat.findMany({
      where: { campaign: { organizationId, sentAt: { gte: since }, deletedAt: null } },
    });

    const totals = campaignStats.reduce(
      (acc, s) => ({
        sent: acc.sent + s.sent,
        delivered: acc.delivered + s.delivered,
        opened: acc.opened + s.uniqueOpened,
        clicked: acc.clicked + s.uniqueClicked,
        bounced: acc.bounced + s.bounced,
        unsubscribed: acc.unsubscribed + s.unsubscribed,
      }),
      { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 },
    );

    return {
      success: true,
      data: {
        contacts: { total: totalContacts, active: activeContacts },
        campaigns: { total: totalCampaigns },
        sends: totals,
        revenue: totalRevenue._sum.revenue ?? 0,
        openRate: totals.sent > 0 ? ((totals.opened / totals.sent) * 100).toFixed(2) : '0.00',
        ctr: totals.sent > 0 ? ((totals.clicked / totals.sent) * 100).toFixed(2) : '0.00',
      },
    };
  }

  async getCampaignsPerformance(organizationId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { organizationId, status: 'SENT', deletedAt: null },
        include: { stats: true },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.campaign.count({ where: { organizationId, status: 'SENT', deletedAt: null } }),
    ]);

    const data = campaigns.map((c) => {
      const s = c.stats;
      return {
        id: c.id,
        name: c.name,
        subject: c.subject,
        sentAt: c.sentAt,
        sent: s?.sent ?? 0,
        openRate: s && s.sent > 0 ? ((s.uniqueOpened / s.sent) * 100).toFixed(2) : '0.00',
        ctr: s && s.sent > 0 ? ((s.uniqueClicked / s.sent) * 100).toFixed(2) : '0.00',
        revenue: s?.revenue ?? 0,
      };
    });

    return { success: true, data, meta: { total, page, limit } };
  }

  async getTopContacts(organizationId: string) {
    const byScore = await this.prisma.contact.findMany({
      where: { organizationId, deletedAt: null, status: 'ACTIVE' },
      orderBy: { score: 'desc' },
      take: 10,
      select: { id: true, email: true, name: true, score: true, revenue: true },
    });

    const byRevenue = await this.prisma.contact.findMany({
      where: { organizationId, deletedAt: null, revenue: { gt: 0 } },
      orderBy: { revenue: 'desc' },
      take: 10,
      select: { id: true, email: true, name: true, score: true, revenue: true },
    });

    return { success: true, data: { byScore, byRevenue } };
  }

  async getRevenueAnalytics(organizationId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const conversions = await this.prisma.conversion.findMany({
      where: { organizationId, attributedAt: { gte: since } },
      include: {
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { attributedAt: 'desc' },
    });

    const byCampaign = conversions.reduce((acc: any, c) => {
      const key = c.campaignId ?? 'direct';
      const name = c.campaign?.name ?? 'Direto';
      if (!acc[key]) acc[key] = { id: key, name, revenue: 0, count: 0 };
      acc[key].revenue += c.revenue;
      acc[key].count += 1;
      return acc;
    }, {});

    return {
      success: true,
      data: {
        total: conversions.reduce((sum, c) => sum + c.revenue, 0),
        byCampaign: Object.values(byCampaign),
        recentConversions: conversions.slice(0, 20),
      },
    };
  }

  async getDeliverabilityStats(organizationId: string) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const stats = await this.prisma.campaignStat.findMany({
      where: { campaign: { organizationId, sentAt: { gte: since }, deletedAt: null } },
    });

    const totals = stats.reduce(
      (acc, s) => ({
        sent: acc.sent + s.sent,
        bounced: acc.bounced + s.bounced,
        spam: acc.spam + s.spamComplaints,
        opened: acc.opened + s.uniqueOpened,
      }),
      { sent: 0, bounced: 0, spam: 0, opened: 0 },
    );

    const bounceRate = totals.sent > 0 ? (totals.bounced / totals.sent) * 100 : 0;
    const spamRate = totals.sent > 0 ? (totals.spam / totals.sent) * 100 : 0;

    return {
      success: true,
      data: {
        ...totals,
        bounceRate: bounceRate.toFixed(3),
        spamRate: spamRate.toFixed(3),
        alerts: [
          ...(bounceRate > 2 ? [{ type: 'warning', message: `Bounce rate alta: ${bounceRate.toFixed(2)}%` }] : []),
          ...(spamRate > 0.1 ? [{ type: 'danger', message: `Spam complaint rate alta: ${spamRate.toFixed(3)}%` }] : []),
        ],
      },
    };
  }
}
