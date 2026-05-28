import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const channels = await this.prisma.channel.findMany({
      where: { organizationId },
    });
    return {
      success: true,
      data: channels.map((c) => ({
        ...c,
        config: this.maskConfig(c.config as Record<string, any>),
      })),
    };
  }

  async configureSms(organizationId: string, config: any) {
    const channel = await this.prisma.channel.upsert({
      where: { organizationId_type: { organizationId, type: 'SMS' } },
      create: {
        organizationId,
        type: 'SMS',
        config: {
          accountSid: config.accountSid,
          authToken: config.authToken,
          phoneNumber: config.phoneNumber,
        },
        isActive: true,
      },
      update: {
        config: {
          accountSid: config.accountSid,
          authToken: config.authToken,
          phoneNumber: config.phoneNumber,
        },
        isActive: true,
      },
    });
    return { success: true, data: { id: channel.id, type: channel.type, isActive: channel.isActive } };
  }

  async configureWhatsapp(organizationId: string, config: any) {
    const channel = await this.prisma.channel.upsert({
      where: { organizationId_type: { organizationId, type: 'WHATSAPP' } },
      create: {
        organizationId,
        type: 'WHATSAPP',
        config,
        isActive: true,
      },
      update: { config, isActive: true },
    });
    return { success: true, data: { id: channel.id, type: channel.type, isActive: channel.isActive } };
  }

  async sendSms(organizationId: string, to: string, message: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { organizationId_type: { organizationId, type: 'SMS' } },
    });
    if (!channel?.isActive) {
      return { success: false, error: { message: 'Canal SMS não configurado' } };
    }

    const config = channel.config as any;
    const { default: Twilio } = await import('twilio');
    const client = new (Twilio as any)(config.accountSid, config.authToken);

    const msg = await client.messages.create({
      body: message,
      from: config.phoneNumber,
      to,
    });

    return { success: true, data: { sid: msg.sid } };
  }

  private maskConfig(config: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(config)) {
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
        result[key] = '***';
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
