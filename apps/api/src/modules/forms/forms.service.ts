import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { SesService } from '../../shared/ses/ses.service';

@Injectable()
export class FormsService {
  constructor(
    private prisma: PrismaService,
    private ses: SesService,
    private config: ConfigService,
  ) {}

  async findAll(organizationId: string) {
    const forms = await this.prisma.form.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: forms };
  }

  async findOne(organizationId: string, id: string) {
    const form = await this.prisma.form.findFirst({
      where: { id, organizationId },
    });
    if (!form) throw new NotFoundException('Formulário não encontrado');
    return { success: true, data: form };
  }

  async create(organizationId: string, dto: any) {
    const form = await this.prisma.form.create({
      data: {
        organizationId,
        listId: dto.listId,
        automationId: dto.automationId,
        name: dto.name,
        fields: dto.fields ?? [],
        settings: dto.settings ?? {},
        doubleOptIn: dto.doubleOptIn ?? false,
      },
    });
    return { success: true, data: form };
  }

  async getEmbedCode(id: string) {
    const apiUrl = this.config.get<string>('API_URL', 'http://localhost:3001');
    const snippet = `<script src="${apiUrl}/forms/${id}/embed.js" async></script>
<div data-mailmax-form="${id}"></div>`;
    return { success: true, data: { snippet } };
  }

  async submit(id: string, data: any, ip: string) {
    const form = await this.prisma.form.findUnique({
      where: { id },
      include: { organization: true },
    });
    if (!form) throw new NotFoundException('Formulário não encontrado');

    if (data._honeypot) {
      return { success: true, data: { submitted: true } };
    }

    const email = data.email;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: { code: 400, message: 'Email inválido' } };
    }

    const contact = await this.prisma.contact.upsert({
      where: {
        organizationId_email: {
          organizationId: form.organizationId,
          email,
        },
      },
      create: {
        organizationId: form.organizationId,
        email,
        name: data.name ?? null,
        phone: data.phone ?? null,
        status: form.doubleOptIn ? 'UNSUBSCRIBED' : 'ACTIVE',
        customFields: this.extractExtra(data),
      },
      update: {
        name: data.name ?? undefined,
        phone: data.phone ?? undefined,
      },
    });

    if (form.listId && !form.doubleOptIn) {
      await this.prisma.listContact.upsert({
        where: {
          listId_contactId: { listId: form.listId, contactId: contact.id },
        },
        create: { listId: form.listId, contactId: contact.id },
        update: {},
      });
    }

    if (form.doubleOptIn) {
      const apiUrl = this.config.get<string>('API_URL', 'http://localhost:3001');
      const confirmToken = Buffer.from(`${contact.id}:${form.id}`).toString('base64');
      await this.ses.sendEmail({
        to: email,
        from: this.config.get<string>('SES_FROM_EMAIL', 'noreply@mailmaxpro.com'),
        fromName: form.organization.name,
        subject: 'Confirme seu cadastro',
        html: `<p>Clique no link para confirmar seu cadastro: <a href="${apiUrl}/forms/${id}/confirm?token=${confirmToken}">Confirmar</a></p>`,
      });
    }

    return { success: true, data: { submitted: true } };
  }

  private extractExtra(data: Record<string, any>): Record<string, any> {
    const known = ['email', 'name', 'phone', '_honeypot'];
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!known.includes(key)) result[key] = value;
    }
    return result;
  }
}
