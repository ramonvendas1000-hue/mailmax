import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { SesService } from '../../shared/ses/ses.service';

@Injectable()
export class AutomationWorker implements OnModuleInit {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private ses: SesService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    this.intervalId = setInterval(() => this.processEnrollments(), 60_000);
    console.log('Automation worker iniciado (intervalo: 60s)');
  }

  private async processEnrollments() {
    const now = new Date();

    const enrollments = await this.prisma.automationEnrollment.findMany({
      where: {
        status: 'ACTIVE',
        nextRunAt: { lte: now },
      },
      include: {
        automation: true,
        contact: true,
      },
      take: 100,
    });

    for (const enrollment of enrollments) {
      try {
        await this.processEnrollment(enrollment);
      } catch (err) {
        console.error(`Erro ao processar enrollment ${enrollment.id}: ${(err as Error).message}`);
      }
    }
  }

  private async processEnrollment(enrollment: any) {
    const nodes = enrollment.automation.nodes as any[];
    const edges = enrollment.automation.edges as any[];
    const contact = enrollment.contact;

    const currentNode = nodes.find((n) => n.id === enrollment.currentNodeId);
    if (!currentNode) {
      await this.prisma.automationEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      return;
    }

    const executions = enrollment.nodeExecutions as Record<string, string>;
    const lastExec = executions[currentNode.id];
    if (lastExec) {
      const lastExecDate = new Date(lastExec);
      const diff = Date.now() - lastExecDate.getTime();
      if (diff < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const nextNodeId = await this.executeNode(currentNode, contact, edges);

    const updatedExecutions = {
      ...executions,
      [currentNode.id]: new Date().toISOString(),
    };

    if (!nextNodeId) {
      await this.prisma.automationEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          nodeExecutions: updatedExecutions,
        },
      });
    } else {
      const nextNode = nodes.find((n) => n.id === nextNodeId);
      const nextRun = this.calculateNextRun(nextNode);

      await this.prisma.automationEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentNodeId: nextNodeId,
          nextRunAt: nextRun,
          nodeExecutions: updatedExecutions,
        },
      });
    }
  }

  private async executeNode(node: any, contact: any, edges: any[]): Promise<string | null> {
    const config = node.config ?? {};

    switch (node.type) {
      case 'action_add_tag':
        await this.prisma.contact.update({
          where: { id: contact.id },
          data: { tags: { push: config.tag } },
        });
        break;

      case 'action_remove_tag':
        await this.prisma.contact.update({
          where: { id: contact.id },
          data: { tags: contact.tags.filter((t: string) => t !== config.tag) },
        });
        break;

      case 'action_update_score':
        await this.prisma.contact.update({
          where: { id: contact.id },
          data: {
            score: {
              increment: config.delta ?? 0,
            },
          },
        });
        break;

      case 'action_update_field':
        await this.prisma.contact.update({
          where: { id: contact.id },
          data: {
            customFields: {
              ...(contact.customFields as Record<string, any>),
              [config.field]: config.value,
            },
          },
        });
        break;

      case 'action_send_email':
        if (config.templateId) {
          const template = await this.prisma.emailTemplate.findUnique({
            where: { id: config.templateId },
          });
          if (template) {
            await this.ses.sendEmail({
              to: contact.email,
              from: this.config.get('SES_FROM_EMAIL', 'noreply@mailmaxpro.com'),
              fromName: 'MailMax Pro',
              subject: config.subject ?? template.subject,
              html: template.htmlContent,
            });
          }
        }
        break;

      case 'wait_duration': {
        const duration = config.duration ?? 1;
        const unit = config.unit ?? 'days';
        const ms = unit === 'hours' ? duration * 3600000 : duration * 86400000;
        const nextRun = new Date(Date.now() + ms);
        const outEdge = edges.find((e) => e.source === node.id);
        if (outEdge) {
          await this.prisma.automationEnrollment.updateMany({
            where: { currentNodeId: node.id, contact: { id: contact.id } },
            data: { nextRunAt: nextRun },
          });
        }
        break;
      }

      case 'condition_if_else': {
        const result = this.evaluateCondition(contact, config);
        const trueEdge = edges.find((e) => e.source === node.id && e.condition === 'true');
        const falseEdge = edges.find((e) => e.source === node.id && e.condition === 'false');
        return result
          ? (trueEdge?.target ?? null)
          : (falseEdge?.target ?? null);
      }
    }

    const outEdge = edges.find((e) => e.source === node.id);
    return outEdge?.target ?? null;
  }

  private evaluateCondition(contact: any, config: any): boolean {
    const { field, operator, value } = config;
    const contactValue = (contact as any)[field];

    switch (operator) {
      case 'equals': return String(contactValue) === String(value);
      case 'not_equals': return String(contactValue) !== String(value);
      case 'greater_than': return Number(contactValue) > Number(value);
      case 'less_than': return Number(contactValue) < Number(value);
      case 'contains': return String(contactValue).includes(String(value));
      default: return false;
    }
  }

  private calculateNextRun(node: any): Date {
    if (!node || node.type !== 'wait_duration') return new Date();
    const duration = node.config?.duration ?? 1;
    const unit = node.config?.unit ?? 'days';
    const ms = unit === 'hours' ? duration * 3600000 : duration * 86400000;
    return new Date(Date.now() + ms);
  }
}
