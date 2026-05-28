import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

export interface SegmentCondition {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'greater_than'
    | 'less_than'
    | 'in_last_days'
    | 'not_in_last_days';
  value: string | number;
}

@Injectable()
export class SegmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const segments = await this.prisma.segment.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: segments };
  }

  async findOne(organizationId: string, id: string) {
    const segment = await this.prisma.segment.findFirst({
      where: { id, organizationId },
    });
    if (!segment) throw new NotFoundException('Segmento não encontrado');
    return { success: true, data: segment };
  }

  async create(
    organizationId: string,
    dto: {
      name: string;
      conditions: SegmentCondition[];
      conditionLogic?: 'AND' | 'OR';
    },
  ) {
    const segment = await this.prisma.segment.create({
      data: {
        organizationId,
        name: dto.name,
        conditions: dto.conditions as any,
        conditionLogic: dto.conditionLogic ?? 'AND',
      },
    });
    return { success: true, data: segment };
  }

  async countContacts(organizationId: string, id: string) {
    const segment = await this.prisma.segment.findFirst({
      where: { id, organizationId },
    });
    if (!segment) throw new NotFoundException('Segmento não encontrado');

    const conditions = segment.conditions as unknown as SegmentCondition[];
    const where = this.buildWhereClause(organizationId, conditions, segment.conditionLogic);
    const count = await this.prisma.contact.count({ where: where as any });
    return { success: true, data: { count } };
  }

  async getContactsBySegment(
    organizationId: string,
    conditions: SegmentCondition[],
    conditionLogic: 'AND' | 'OR' = 'AND',
  ) {
    const where = this.buildWhereClause(organizationId, conditions, conditionLogic);
    return this.prisma.contact.findMany({
      where: where as any,
      select: { id: true, email: true, name: true, status: true },
    });
  }

  async getRfmSegments(organizationId: string) {
    const now = new Date();
    const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const days15 = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    const [vip, rising, atRisk, dormant, newContacts, singleBuyers] =
      await Promise.all([
        this.prisma.contact.count({
          where: {
            organizationId,
            deletedAt: null,
            status: ContactStatus.ACTIVE,
            score: { gt: 80 },
            lastOpenAt: { gt: days30 },
          },
        }),
        this.prisma.contact.count({
          where: {
            organizationId,
            deletedAt: null,
            status: ContactStatus.ACTIVE,
            score: { gte: 50, lte: 80 },
            lastOpenAt: { gt: days30 },
          },
        }),
        this.prisma.contact.count({
          where: {
            organizationId,
            deletedAt: null,
            status: ContactStatus.ACTIVE,
            score: { gt: 50 },
            lastOpenAt: { gt: days60, lt: days30 },
          },
        }),
        this.prisma.contact.count({
          where: {
            organizationId,
            deletedAt: null,
            status: ContactStatus.ACTIVE,
            lastOpenAt: { lt: days60 },
          },
        }),
        this.prisma.contact.count({
          where: {
            organizationId,
            deletedAt: null,
            createdAt: { gt: days15 },
          },
        }),
        this.prisma.contact.count({
          where: {
            organizationId,
            deletedAt: null,
            revenue: { gt: 0 },
          },
        }),
      ]);

    return {
      success: true,
      data: [
        { category: 'VIP', count: vip, description: 'Score > 80, engajados nos últimos 30 dias' },
        { category: 'Em ascensão', count: rising, description: 'Score 50-80, engajados nos últimos 30 dias' },
        { category: 'Em risco', count: atRisk, description: 'Score > 50, sem abertura em 30-60 dias' },
        { category: 'Dormentes', count: dormant, description: 'Sem abertura há mais de 60 dias' },
        { category: 'Novos', count: newContacts, description: 'Criados nos últimos 15 dias' },
        { category: 'Compradores', count: singleBuyers, description: 'Com receita atribuída' },
      ],
    };
  }

  private buildWhereClause(
    organizationId: string,
    conditions: SegmentCondition[],
    logic: string,
  ) {
    const clauses = conditions.map((c) => this.conditionToWhere(c));
    const base = { organizationId, deletedAt: null, status: ContactStatus.ACTIVE };

    if (clauses.length === 0) return base;

    return logic === 'AND'
      ? { ...base, AND: clauses }
      : { ...base, OR: clauses };
  }

  private conditionToWhere(c: SegmentCondition) {
    const now = new Date();

    switch (c.field) {
      case 'score':
        return this.numericFilter('score', c.operator, Number(c.value));
      case 'revenue':
        return this.numericFilter('revenue', c.operator, Number(c.value));
      case 'status':
        return c.operator === 'equals'
          ? { status: c.value }
          : { NOT: { status: c.value } };
      case 'tags':
        return c.operator === 'contains'
          ? { tags: { has: String(c.value) } }
          : { NOT: { tags: { has: String(c.value) } } };
      case 'last_open_at':
        return this.dateFilter('lastOpenAt', c.operator, Number(c.value), now);
      case 'last_click_at':
        return this.dateFilter('lastClickAt', c.operator, Number(c.value), now);
      case 'created_at':
        return this.dateFilter('createdAt', c.operator, Number(c.value), now);
      default:
        if (c.field.startsWith('customFields.')) {
          const key = c.field.replace('customFields.', '');
          return {
            customFields: {
              path: [key],
              string_contains: String(c.value),
            },
          };
        }
        return {};
    }
  }

  private numericFilter(field: string, operator: string, value: number) {
    switch (operator) {
      case 'equals': return { [field]: value };
      case 'not_equals': return { NOT: { [field]: value } };
      case 'greater_than': return { [field]: { gt: value } };
      case 'less_than': return { [field]: { lt: value } };
      default: return {};
    }
  }

  private dateFilter(field: string, operator: string, days: number, now: Date) {
    const date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    switch (operator) {
      case 'in_last_days': return { [field]: { gt: date } };
      case 'not_in_last_days': return { [field]: { lt: date } };
      default: return {};
    }
  }
}
