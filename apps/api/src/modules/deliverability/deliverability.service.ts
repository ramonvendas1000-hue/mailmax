import { Injectable } from '@nestjs/common';
import { promisify } from 'util';
import * as dns from 'dns';
import { PrismaService } from '../../shared/prisma/prisma.service';

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

const WARMUP_PLAN = [500, 2000, 10000, 50000];

@Injectable()
export class DeliverabilityService {
  constructor(private prisma: PrismaService) {}

  async getHealth(organizationId: string) {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const stats = await this.prisma.campaignStat.findMany({
      where: { campaign: { organizationId, sentAt: { gte: since7d } } },
    });

    const totals = stats.reduce(
      (acc, s) => ({
        sent: acc.sent + s.sent,
        bounced: acc.bounced + s.bounced,
        spam: acc.spam + s.spamComplaints,
      }),
      { sent: 0, bounced: 0, spam: 0 },
    );

    const bounceRate = totals.sent > 0 ? (totals.bounced / totals.sent) * 100 : 0;
    const spamRate = totals.sent > 0 ? (totals.spam / totals.sent) * 100 : 0;

    let score = 100;
    if (bounceRate > 2) score -= 30;
    else if (bounceRate > 1) score -= 15;
    if (spamRate > 0.3) score -= 50;
    else if (spamRate > 0.1) score -= 20;

    const warmup = await this.prisma.ipWarmup.findUnique({ where: { organizationId } });

    return {
      success: true,
      data: {
        score: Math.max(0, score),
        bounceRate: bounceRate.toFixed(3),
        spamRate: spamRate.toFixed(4),
        warmupWeek: warmup?.currentWeek ?? 1,
        isWarmingUp: (warmup?.currentWeek ?? 0) < 5,
        alerts: [
          ...(bounceRate > 2 ? [{ type: 'danger', message: 'Bounce rate acima de 2%' }] : []),
          ...(spamRate > 0.3 ? [{ type: 'danger', message: 'Spam rate acima de 0.3% — envios bloqueados' }] : []),
          ...(spamRate > 0.1 ? [{ type: 'warning', message: 'Spam rate acima de 0.1%' }] : []),
        ],
      },
    };
  }

  async checkDns(domain: string) {
    const results: Record<string, { status: string; value?: string }> = {};

    try {
      const spfRecords = await resolveTxt(domain);
      const spf = spfRecords.flat().find((r) => r.startsWith('v=spf1'));
      results.spf = spf
        ? { status: 'configured', value: spf }
        : { status: 'missing' };
    } catch {
      results.spf = { status: 'missing' };
    }

    try {
      const dkimRecords = await resolveTxt(`default._domainkey.${domain}`);
      const dkim = dkimRecords.flat().find((r) => r.includes('v=DKIM1'));
      results.dkim = dkim
        ? { status: 'configured', value: dkim.substring(0, 50) + '...' }
        : { status: 'missing' };
    } catch {
      results.dkim = { status: 'missing' };
    }

    try {
      const dmarcRecords = await resolveTxt(`_dmarc.${domain}`);
      const dmarc = dmarcRecords.flat().find((r) => r.startsWith('v=DMARC1'));
      results.dmarc = dmarc
        ? { status: 'configured', value: dmarc }
        : { status: 'missing' };
    } catch {
      results.dmarc = { status: 'missing' };
    }

    return { success: true, data: { domain, ...results } };
  }

  async getWarmupStatus(organizationId: string) {
    const warmup = await this.prisma.ipWarmup.findUnique({ where: { organizationId } });

    if (!warmup) {
      return {
        success: true,
        data: { started: false, currentWeek: 0, dailyLimit: 0 },
      };
    }

    const currentLimit = WARMUP_PLAN[Math.min(warmup.currentWeek - 1, WARMUP_PLAN.length - 1)];
    const isCompleted = warmup.currentWeek > WARMUP_PLAN.length;

    return {
      success: true,
      data: {
        started: true,
        startedAt: warmup.startedAt,
        currentWeek: warmup.currentWeek,
        dailyLimit: isCompleted ? null : currentLimit,
        dailySentToday: warmup.dailySentToday,
        isCompleted,
        plan: WARMUP_PLAN.map((limit, i) => ({
          week: i + 1,
          limit,
          completed: warmup.currentWeek > i + 1,
          current: warmup.currentWeek === i + 1,
        })),
      },
    };
  }

  async validateList(organizationId: string, listId: string) {
    const contacts = await this.prisma.contact.findMany({
      where: {
        organizationId,
        listMemberships: { some: { listId } },
        status: 'ACTIVE',
      },
      select: { email: true, status: true },
    });

    const suppressed = contacts.filter((c) => c.status !== 'ACTIVE').length;
    const active = contacts.filter((c) => c.status === 'ACTIVE').length;

    return {
      success: true,
      data: {
        total: contacts.length,
        active,
        suppressed,
        estimatedDeliverable: active,
      },
    };
  }

  async checkDailyLimit(organizationId: string, count: number): Promise<boolean> {
    const warmup = await this.prisma.ipWarmup.findUnique({ where: { organizationId } });
    if (!warmup || warmup.currentWeek > WARMUP_PLAN.length) return true;

    const limit = WARMUP_PLAN[warmup.currentWeek - 1];
    return warmup.dailySentToday + count <= limit;
  }
}
