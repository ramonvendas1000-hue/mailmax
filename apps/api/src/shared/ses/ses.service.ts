import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SESClient,
  SendEmailCommand,
  type SendEmailCommandInput,
} from '@aws-sdk/client-ses';

export interface SendEmailOptions {
  to: string;
  from: string;
  fromName: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
}

@Injectable()
export class SesService {
  private client: SESClient;

  constructor(private config: ConfigService) {
    this.client = new SESClient({
      region: config.get<string>('AWS_REGION', 'us-east-1'),
      credentials:
        config.get('AWS_ACCESS_KEY_ID')
          ? {
              accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID')!,
              secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY')!,
            }
          : undefined,
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<string> {
    const input: SendEmailCommandInput = {
      Destination: { ToAddresses: [options.to] },
      Message: {
        Subject: { Data: options.subject, Charset: 'UTF-8' },
        Body: { Html: { Data: options.html, Charset: 'UTF-8' } },
      },
      Source: `${options.fromName} <${options.from}>`,
    };

    const command = new SendEmailCommand(input);
    const result = await this.client.send(command);
    return result.MessageId ?? '';
  }
}
