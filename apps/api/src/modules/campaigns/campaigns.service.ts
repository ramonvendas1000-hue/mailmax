import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { SendingService } from '../sending/sending.service';

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private sendingService: SendingService,
  ) {}

  async findAll(organizationId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { organizationId, deletedAt: null },
        include: { stats: true, _count: { select: { emails: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.campaign.count({ where: { organizationId, deletedAt: null } }),
    ]);
    return { success: true, data, meta: { total, page, limit } };
  }

  async findOne(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        template: true,
        stats: true,
        lists: { include: { list: { select: { id: true, name: true } } } },
        segments: { include: { segment: { select: { id: true, name: true } } } },
      },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    return { success: true, data: campaign };
  }

  async create(organizationId: string, dto: any) {
    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId,
        name: dto.name,
        subject: dto.subject,
        previewText: dto.previewText,
        fromName: dto.fromName,
        fromEmail: dto.fromEmail,
        templateId: dto.templateId,
        lists: dto.listIds?.length
          ? { create: dto.listIds.map((id: string) => ({ listId: id })) }
          : undefined,
        segments: dto.segmentIds?.length
          ? { create: dto.segmentIds.map((id: string) => ({ segmentId: id })) }
          : undefined,
      },
    });
    return { success: true, data: campaign };
  }

  async update(organizationId: string, id: string, dto: any) {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, organizationId, deletedAt: null, status: 'DRAFT' },
    });
    if (!existing) throw new NotFoundException('Campanha não encontrada ou não pode ser editada');

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name,
        subject: dto.subject,
        previewText: dto.previewText,
        fromName: dto.fromName,
        fromEmail: dto.fromEmail,
        templateId: dto.templateId,
      },
    });
    return { success: true, data: campaign };
  }

  async send(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      throw new BadRequestException('Campanha já foi enviada ou está em processamento');
    }

    const enqueued = await this.sendingService.enqueueCampaign(id);
    return { success: true, data: { enqueued, message: `${enqueued} emails enfileirados` } };
  }

  async schedule(organizationId: string, id: string, scheduledAt: Date) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId, deletedAt: null, status: 'DRAFT' },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'SCHEDULED', scheduledAt },
    });
    return { success: true, data: updated };
  }

  async getStats(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { stats: true },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');

    const stats = campaign.stats;
    if (!stats) return { success: true, data: { sent: 0, opened: 0, clicked: 0 } };

    const openRate = stats.sent > 0 ? (stats.uniqueOpened / stats.sent) * 100 : 0;
    const ctr = stats.sent > 0 ? (stats.uniqueClicked / stats.sent) * 100 : 0;
    const ctor = stats.uniqueOpened > 0 ? (stats.uniqueClicked / stats.uniqueOpened) * 100 : 0;

    return {
      success: true,
      data: {
        ...stats,
        openRate: openRate.toFixed(2),
        ctr: ctr.toFixed(2),
        ctor: ctor.toFixed(2),
      },
    };
  }

  async configureAbTest(organizationId: string, id: string, config: any) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId, deletedAt: null, status: 'DRAFT' },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { isAbTest: true, abConfig: config },
    });
    return { success: true, data: updated };
  }

  async estimateReach(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        lists: { include: { list: { include: { _count: { select: { contacts: true } } } } } },
      },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');

    const total = campaign.lists.reduce((sum, cl) => sum + cl.list._count.contacts, 0);
    return { success: true, data: { estimatedReach: total } };
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Campanha não encontrada');

    await this.prisma.campaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true, data: { deleted: true } };
  }
}
