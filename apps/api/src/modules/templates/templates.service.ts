import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { SesService } from '../../shared/ses/ses.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mjml2html = require('mjml') as (input: string, opts?: any) => { html: string; errors: any[] };

export interface EmailBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'html' | 'columns';
  content?: string;
  url?: string;
  src?: string;
  alt?: string;
  columns?: EmailBlock[][];
  styles?: Record<string, string>;
}

@Injectable()
export class TemplatesService {
  constructor(
    private prisma: PrismaService,
    private ses: SesService,
    private config: ConfigService,
  ) {}

  async findAll(organizationId: string) {
    const templates = await this.prisma.emailTemplate.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { success: true, data: templates };
  }

  async findOne(organizationId: string, id: string) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 10 },
      },
    });
    if (!template) throw new NotFoundException('Template não encontrado');
    return { success: true, data: template };
  }

  async create(
    organizationId: string,
    dto: {
      name: string;
      subject: string;
      previewText?: string;
      blocks: EmailBlock[];
    },
  ) {
    const { html, mjml } = this.renderBlocks(dto.blocks);

    const template = await this.prisma.emailTemplate.create({
      data: {
        organizationId,
        name: dto.name,
        subject: dto.subject,
        previewText: dto.previewText,
        blocks: dto.blocks as any,
        htmlContent: html,
        mjmlContent: mjml,
        status: 'DRAFT',
      },
    });
    return { success: true, data: template };
  }

  async update(
    organizationId: string,
    id: string,
    dto: {
      name?: string;
      subject?: string;
      previewText?: string;
      blocks?: EmailBlock[];
    },
  ) {
    const existing = await this.prisma.emailTemplate.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Template não encontrado');

    const currentBlocks = existing.blocks as unknown as EmailBlock[];
    const lastVersion = await this.prisma.templateVersion.findFirst({
      where: { templateId: id },
      orderBy: { version: 'desc' },
    });

    await this.prisma.templateVersion.create({
      data: {
        templateId: id,
        version: (lastVersion?.version ?? 0) + 1,
        blocks: existing.blocks as any,
        htmlContent: existing.htmlContent,
      },
    });

    const oldVersions = await this.prisma.templateVersion.findMany({
      where: { templateId: id },
      orderBy: { version: 'desc' },
      skip: 10,
    });
    if (oldVersions.length > 0) {
      await this.prisma.templateVersion.deleteMany({
        where: { id: { in: oldVersions.map((v) => v.id) } },
      });
    }

    const blocks = dto.blocks ?? currentBlocks;
    const { html, mjml } = this.renderBlocks(blocks);

    const template = await this.prisma.emailTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        subject: dto.subject,
        previewText: dto.previewText,
        blocks: blocks as any,
        htmlContent: html,
        mjmlContent: mjml,
      },
    });
    return { success: true, data: template };
  }

  async preview(organizationId: string, id: string) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!template) throw new NotFoundException('Template não encontrado');
    return { success: true, data: { html: template.htmlContent } };
  }

  async sendTest(
    organizationId: string,
    id: string,
    toEmail: string,
  ) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!template) throw new NotFoundException('Template não encontrado');

    const html = this.interpolate(template.htmlContent, {
      'contact.name': 'Contato Teste',
      'contact.email': toEmail,
      unsubscribe_link: '#',
      view_in_browser_link: '#',
    });

    await this.ses.sendEmail({
      to: toEmail,
      from: this.config.get<string>('SES_FROM_EMAIL', 'noreply@mailmaxpro.com'),
      fromName: 'MailMax Pro',
      subject: `[TESTE] ${template.subject}`,
      html,
    });

    return { success: true, data: { sent: true } };
  }

  renderBlocks(blocks: EmailBlock[]): { html: string; mjml: string } {
    const mjmlBody = blocks.map((b) => this.blockToMjml(b)).join('\n');
    const mjmlSource = `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="14px" line-height="1.6" color="#333333" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="20px">
      <mj-column>
        ${mjmlBody}
        <mj-text font-size="12px" color="#999999" align="center">
          <a href="{{unsubscribe_link}}">Descadastrar</a> |
          <a href="{{view_in_browser_link}}">Ver no navegador</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

    try {
      const result = mjml2html(mjmlSource, { validationLevel: 'skip' });
      return { html: result.html, mjml: mjmlSource };
    } catch {
      const fallbackHtml = `<html><body>${blocks.map((b) => this.blockToHtml(b)).join('')}<p style="font-size:12px;color:#999">
        <a href="{{unsubscribe_link}}">Descadastrar</a></p></body></html>`;
      return { html: fallbackHtml, mjml: mjmlSource };
    }
  }

  interpolate(html: string, vars: Record<string, string>): string {
    return html.replace(/\{\{([\w.]+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }

  private blockToMjml(block: EmailBlock): string {
    switch (block.type) {
      case 'text':
        return `<mj-text>${block.content ?? ''}</mj-text>`;
      case 'image':
        return `<mj-image src="${block.src ?? ''}" alt="${block.alt ?? ''}" />`;
      case 'button':
        return `<mj-button href="${block.url ?? '#'}">${block.content ?? 'Clique aqui'}</mj-button>`;
      case 'divider':
        return `<mj-divider border-color="#eeeeee" />`;
      case 'spacer':
        return `<mj-spacer height="20px" />`;
      case 'html':
        return `<mj-raw>${block.content ?? ''}</mj-raw>`;
      default:
        return `<mj-text>${block.content ?? ''}</mj-text>`;
    }
  }

  private blockToHtml(block: EmailBlock): string {
    switch (block.type) {
      case 'text': return `<div>${block.content ?? ''}</div>`;
      case 'image': return `<img src="${block.src ?? ''}" alt="${block.alt ?? ''}" style="max-width:100%" />`;
      case 'button': return `<a href="${block.url ?? '#'}" style="background:#4f46e5;color:white;padding:12px 24px;text-decoration:none;border-radius:4px">${block.content ?? 'Clique aqui'}</a>`;
      case 'divider': return `<hr style="border:1px solid #eee" />`;
      case 'spacer': return `<div style="height:20px"></div>`;
      case 'html': return block.content ?? '';
      default: return `<div>${block.content ?? ''}</div>`;
    }
  }
}
