import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  constructor(private config: ConfigService) {}

  async sendEmail(options: SendEmailOptions): Promise<string> {
    const resendKey = this.config.get<string>('RESEND_API_KEY');

    if (resendKey) {
      return this.sendViaResend(options, resendKey);
    }

    // Fallback: log only (no SES configured)
    console.log(`[Email] To: ${options.to} | Subject: ${options.subject} | (no provider configured)`);
    return 'simulated';
  }

  private async sendViaResend(options: SendEmailOptions, apiKey: string): Promise<string> {
    const fromAddress = options.fromName
      ? `${options.fromName} <${options.from}>`
      : options.from;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });

    const data = await res.json() as any;

    if (!res.ok) {
      throw new Error(`Resend error: ${data.message || res.statusText}`);
    }

    return data.id ?? '';
  }
}
