import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { SesService } from '../../shared/ses/ses.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FollowupService {
  constructor(
    private prisma: PrismaService,
    private ses: SesService,
    private config: ConfigService,
  ) {}

  async findAll(organizationId: string) {
    const sequences = await this.prisma.followupSequence.findMany({
      where: { organizationId },
      include: {
        _count: { select: { steps: true, enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: sequences };
  }

  async findOne(organizationId: string, id: string) {
    const seq = await this.prisma.followupSequence.findFirst({
      where: { id, organizationId },
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
        _count: { select: { enrollments: true } },
      },
    });
    if (!seq) throw new NotFoundException('Sequência não encontrada');
    return { success: true, data: seq };
  }

  async create(organizationId: string, dto: {
    name: string;
    description?: string;
    fromName: string;
    fromEmail: string;
    waitHours?: number;
    maxSteps?: number;
  }) {
    const maxSteps = Math.min(dto.maxSteps ?? 3, 10);
    const seq = await this.prisma.followupSequence.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        fromName: dto.fromName,
        fromEmail: dto.fromEmail,
        waitHours: dto.waitHours ?? 24,
        maxSteps,
      },
    });
    return { success: true, data: seq };
  }

  async addStep(organizationId: string, sequenceId: string, dto: {
    subject: string;
    body: string;
    delayHours?: number;
  }) {
    const seq = await this.prisma.followupSequence.findFirst({
      where: { id: sequenceId, organizationId },
      include: { steps: true },
    });
    if (!seq) throw new NotFoundException('Sequência não encontrada');
    if (seq.steps.length >= seq.maxSteps) {
      throw new BadRequestException(`Limite de ${seq.maxSteps} follow-ups atingido`);
    }

    const stepNumber = seq.steps.length + 1;
    const step = await this.prisma.followupStep.create({
      data: {
        sequenceId,
        stepNumber,
        subject: dto.subject,
        body: dto.body,
        delayHours: dto.delayHours ?? seq.waitHours,
      },
    });
    return { success: true, data: step };
  }

  async deleteStep(organizationId: string, sequenceId: string, stepId: string) {
    const seq = await this.prisma.followupSequence.findFirst({
      where: { id: sequenceId, organizationId },
    });
    if (!seq) throw new NotFoundException('Sequência não encontrada');

    await this.prisma.followupStep.delete({ where: { id: stepId } });

    // Renumber remaining steps
    const remaining = await this.prisma.followupStep.findMany({
      where: { sequenceId },
      orderBy: { stepNumber: 'asc' },
    });
    for (let i = 0; i < remaining.length; i++) {
      await this.prisma.followupStep.update({
        where: { id: remaining[i].id },
        data: { stepNumber: i + 1 },
      });
    }
    return { success: true, data: { deleted: true } };
  }

  async activate(organizationId: string, id: string) {
    const seq = await this.prisma.followupSequence.findFirst({
      where: { id, organizationId },
      include: { steps: true },
    });
    if (!seq) throw new NotFoundException('Sequência não encontrada');
    if (seq.steps.length === 0) throw new BadRequestException('Adicione pelo menos 1 follow-up antes de ativar');

    await this.prisma.followupSequence.update({ where: { id }, data: { status: 'ACTIVE' } });
    return { success: true, data: { status: 'ACTIVE' } };
  }

  async pause(organizationId: string, id: string) {
    const seq = await this.prisma.followupSequence.findFirst({ where: { id, organizationId } });
    if (!seq) throw new NotFoundException('Sequência não encontrada');

    await this.prisma.followupSequence.update({ where: { id }, data: { status: 'PAUSED' } });
    return { success: true, data: { status: 'PAUSED' } };
  }

  async enroll(organizationId: string, sequenceId: string, contactIds: string[]) {
    const seq = await this.prisma.followupSequence.findFirst({
      where: { id: sequenceId, organizationId },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });
    if (!seq) throw new NotFoundException('Sequência não encontrada');
    if (seq.status !== 'ACTIVE') throw new BadRequestException('Ative a sequência antes de inscrever contatos');
    if (seq.steps.length === 0) throw new BadRequestException('Sequência sem follow-ups configurados');

    const nextSendAt = new Date(Date.now() + seq.steps[0].delayHours * 60 * 60 * 1000);
    let enrolled = 0;
    let skipped = 0;

    for (const contactId of contactIds) {
      try {
        await this.prisma.followupEnrollment.upsert({
          where: { sequenceId_contactId: { sequenceId, contactId } },
          create: {
            sequenceId,
            contactId,
            organizationId,
            currentStep: 1,
            status: 'ACTIVE',
            nextSendAt,
          },
          update: {
            status: 'ACTIVE',
            currentStep: 1,
            nextSendAt,
            completedAt: null,
          },
        });
        enrolled++;
      } catch {
        skipped++;
      }
    }

    return { success: true, data: { enrolled, skipped } };
  }

  async getEnrollments(organizationId: string, sequenceId: string) {
    const seq = await this.prisma.followupSequence.findFirst({ where: { id: sequenceId, organizationId } });
    if (!seq) throw new NotFoundException('Sequência não encontrada');

    const enrollments = await this.prisma.followupEnrollment.findMany({
      where: { sequenceId, organizationId },
      include: { contact: { select: { id: true, email: true, name: true } } },
      orderBy: { enrolledAt: 'desc' },
      take: 100,
    });
    return { success: true, data: enrollments };
  }

  // Called by the worker every 5 minutes
  async processFollowups() {
    const now = new Date();
    const enrollments = await this.prisma.followupEnrollment.findMany({
      where: { status: 'ACTIVE', nextSendAt: { lte: now } },
      include: {
        sequence: {
          include: { steps: { orderBy: { stepNumber: 'asc' } } },
        },
        contact: true,
      },
      take: 50,
    });

    let sent = 0;
    let completed = 0;

    for (const enrollment of enrollments) {
      const { sequence, contact } = enrollment;

      if (sequence.status !== 'ACTIVE' || contact.status !== 'ACTIVE') {
        await this.prisma.followupEnrollment.update({
          where: { id: enrollment.id },
          data: { status: 'CANCELLED' },
        });
        continue;
      }

      const step = sequence.steps.find((s) => s.stepNumber === enrollment.currentStep);
      if (!step) {
        await this.prisma.followupEnrollment.update({
          where: { id: enrollment.id },
          data: { status: 'COMPLETED', completedAt: now },
        });
        completed++;
        continue;
      }

      // Send the follow-up email
      try {
        const body = step.body
          .replace(/\{\{contact\.name\}\}/g, contact.name || contact.email)
          .replace(/\{\{contact\.email\}\}/g, contact.email)
          .replace(/\{\{unsubscribe_link\}\}/g, `${this.config.get('TRACKING_URL') || 'http://localhost:3001'}/track/unsubscribe/${contact.id}`);

        await this.ses.sendEmail({
          to: contact.email,
          from: sequence.fromEmail,
          fromName: sequence.fromName,
          subject: step.subject,
          html: body,
        });

        const nextStep = enrollment.currentStep + 1;
        const nextStepData = sequence.steps.find((s) => s.stepNumber === nextStep);

        if (nextStepData) {
          const nextSendAt = new Date(now.getTime() + nextStepData.delayHours * 60 * 60 * 1000);
          await this.prisma.followupEnrollment.update({
            where: { id: enrollment.id },
            data: { currentStep: nextStep, lastSentAt: now, nextSendAt },
          });
        } else {
          await this.prisma.followupEnrollment.update({
            where: { id: enrollment.id },
            data: { status: 'COMPLETED', completedAt: now, lastSentAt: now },
          });
          completed++;
        }
        sent++;
      } catch (err) {
        console.error(`[FollowupWorker] Error sending to ${contact.email}:`, (err as Error).message);
      }
    }

    if (sent > 0 || completed > 0) {
      console.log(`[FollowupWorker] Sent: ${sent}, Completed: ${completed}`);
    }
  }
}
