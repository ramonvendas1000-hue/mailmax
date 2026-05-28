import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactQueryDto } from './dto/contact-query.dto';
import { parse } from 'csv-parse/sync';
import * as dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, query: ContactQueryDto) {
    const { page = 1, limit = 50, search, status, tag } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (tag) where.tags = { has: tag };

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          status: true,
          score: true,
          tags: true,
          revenue: true,
          customFields: true,
          lastOpenAt: true,
          lastClickAt: true,
          createdAt: true,
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(organizationId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        events: { orderBy: { createdAt: 'desc' }, take: 20 },
        listMemberships: { include: { list: { select: { id: true, name: true } } } },
      },
    });
    if (!contact) throw new NotFoundException('Contato não encontrado');
    return { success: true, data: contact };
  }

  async create(organizationId: string, dto: CreateContactDto) {
    const contact = await this.prisma.contact.upsert({
      where: { organizationId_email: { organizationId, email: dto.email } },
      update: {
        name: dto.name,
        phone: dto.phone,
        tags: dto.tags ?? [],
        customFields: dto.customFields ?? {},
      },
      create: {
        organizationId,
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        tags: dto.tags ?? [],
        customFields: dto.customFields ?? {},
      },
    });
    return { success: true, data: contact };
  }

  async update(organizationId: string, id: string, dto: UpdateContactDto) {
    const existing = await this.prisma.contact.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Contato não encontrado');

    const contact = await this.prisma.contact.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        status: dto.status,
        score: dto.score,
        tags: dto.tags,
        customFields: dto.customFields,
      },
    });
    return { success: true, data: contact };
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.prisma.contact.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Contato não encontrado');

    await this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true, data: { deleted: true } };
  }

  async importContacts(organizationId: string, buffer: Buffer, mimetype: string) {
    let rows: Record<string, string>[] = [];

    if (mimetype === 'text/csv' || mimetype === 'application/csv') {
      rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
    } else {
      const { read, utils } = await import('xlsx');
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = utils.sheet_to_json(ws);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const email = row['email'] || row['Email'] || row['EMAIL'];
      if (!email || !this.isValidEmail(email)) {
        skipped++;
        continue;
      }

      try {
        const existing = await this.prisma.contact.findUnique({
          where: { organizationId_email: { organizationId, email } },
        });

        if (existing) {
          await this.prisma.contact.update({
            where: { id: existing.id },
            data: {
              name: row['name'] || row['Name'] || row['nome'] || existing.name,
              phone: row['phone'] || row['telefone'] || existing.phone,
            },
          });
          updated++;
        } else {
          await this.prisma.contact.create({
            data: {
              organizationId,
              email,
              name: row['name'] || row['Name'] || row['nome'] || null,
              phone: row['phone'] || row['telefone'] || null,
              customFields: this.extractCustomFields(row),
            },
          });
          created++;
        }
      } catch (err) {
        errors.push(`${email}: ${(err as Error).message}`);
        skipped++;
      }
    }

    return {
      success: true,
      data: {
        total: rows.length,
        created,
        updated,
        skipped,
        errors: errors.slice(0, 20),
      },
    };
  }

  async exportContacts(organizationId: string): Promise<string> {
    const contacts = await this.prisma.contact.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        email: true,
        name: true,
        phone: true,
        status: true,
        score: true,
        tags: true,
        revenue: true,
        createdAt: true,
      },
    });

    const headers = 'email,name,phone,status,score,tags,revenue,createdAt\n';
    const rows = contacts.map((c) =>
      [
        c.email,
        c.name ?? '',
        c.phone ?? '',
        c.status,
        c.score,
        c.tags.join(';'),
        c.revenue,
        c.createdAt.toISOString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );

    return headers + rows.join('\n');
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private extractCustomFields(row: Record<string, string>): Record<string, string> {
    const known = ['email', 'Email', 'EMAIL', 'name', 'Name', 'nome', 'phone', 'telefone'];
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      if (!known.includes(key) && value) {
        result[key.toLowerCase()] = value;
      }
    }
    return result;
  }
}
