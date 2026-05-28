import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class AutomationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const automations = await this.prisma.automation.findMany({
      where: { organizationId, deletedAt: null },
      include: { _count: { select: { enrollments: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return { success: true, data: automations };
  }

  async findOne(organizationId: string, id: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!automation) throw new NotFoundException('Automação não encontrada');
    return { success: true, data: automation };
  }

  async create(organizationId: string, dto: any) {
    const automation = await this.prisma.automation.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        nodes: dto.nodes ?? [],
        edges: dto.edges ?? [],
        status: 'DRAFT',
      },
    });
    return { success: true, data: automation };
  }

  async update(organizationId: string, id: string, dto: any) {
    const existing = await this.prisma.automation.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Automação não encontrada');

    const automation = await this.prisma.automation.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        nodes: dto.nodes,
        edges: dto.edges,
      },
    });
    return { success: true, data: automation };
  }

  async activate(organizationId: string, id: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!automation) throw new NotFoundException('Automação não encontrada');

    const updated = await this.prisma.automation.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
    return { success: true, data: updated };
  }

  async pause(organizationId: string, id: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!automation) throw new NotFoundException('Automação não encontrada');

    const updated = await this.prisma.automation.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
    return { success: true, data: updated };
  }

  async getStats(organizationId: string, id: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        enrollments: {
          select: { status: true },
        },
      },
    });
    if (!automation) throw new NotFoundException('Automação não encontrada');

    const total = automation.enrollments.length;
    const active = automation.enrollments.filter((e) => e.status === 'ACTIVE').length;
    const completed = automation.enrollments.filter((e) => e.status === 'COMPLETED').length;
    const failed = automation.enrollments.filter((e) => e.status === 'FAILED').length;

    return { success: true, data: { total, active, completed, failed } };
  }

  async enrollContact(automationId: string, contactId: string) {
    const automation = await this.prisma.automation.findUnique({
      where: { id: automationId },
    });
    if (!automation || automation.status !== 'ACTIVE') return null;

    const nodes = automation.nodes as any[];
    const firstNode = nodes[0];

    return this.prisma.automationEnrollment.upsert({
      where: { automationId_contactId: { automationId, contactId } },
      create: {
        automationId,
        contactId,
        currentNodeId: firstNode?.id ?? null,
        status: 'ACTIVE',
        nextRunAt: new Date(),
      },
      update: {},
    });
  }
}
