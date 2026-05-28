import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { Public } from '../../shared/decorators/public.decorator';
import { TrackingService } from './tracking.service';
import { CurrentUser, JwtPayload } from '../../shared/decorators/current-user.decorator';

class ConversionDto {
  @ApiProperty() @IsEmail() contact_email: string;
  @ApiProperty() @IsNumber() @Min(0) revenue: number;
  @ApiProperty({ required: false }) @IsString() @IsOptional() order_id?: string;
}

const TRANSPARENT_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

@ApiTags('tracking')
@Public()
@Controller('track')
export class TrackingController {
  constructor(private trackingService: TrackingService) {}

  @Get('open/:token')
  @ApiOperation({ summary: 'Registra abertura de email' })
  async trackOpen(
    @Param('token') token: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const ip = req.ip ?? '';
    const userAgent = req.headers['user-agent'] ?? '';
    this.trackingService.trackOpen(token, ip, userAgent).catch(() => {});
    res.header('Content-Type', 'image/gif');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(TRANSPARENT_PIXEL);
  }

  @Get('click/:token')
  @ApiOperation({ summary: 'Registra clique e redireciona' })
  async trackClick(
    @Param('token') token: string,
    @Query('url') url: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const ip = req.ip ?? '';
    const userAgent = req.headers['user-agent'] ?? '';
    const redirectUrl = await this.trackingService.trackClick(token, url ?? '#', ip, userAgent);
    res.redirect(redirectUrl ?? url ?? '/');
  }

  @Get('unsub/:token')
  @ApiOperation({ summary: 'Descadastro via link' })
  async trackUnsub(
    @Param('token') token: string,
    @Res() res: FastifyReply,
  ) {
    await this.trackingService.trackUnsubscribe(token);
    res.send({ success: true, message: 'Você foi descadastrado com sucesso.' });
  }

  @Post('bounce')
  @ApiOperation({ summary: 'Webhook SES para bounces' })
  async trackBounce(@Body() payload: any) {
    await this.trackingService.trackBounce(payload);
    return { success: true };
  }

  @Post('complaint')
  @ApiOperation({ summary: 'Webhook SES para spam complaints' })
  async trackComplaint(@Body() payload: any) {
    await this.trackingService.trackComplaint(payload);
    return { success: true };
  }

}

@ApiTags('conversions')
@ApiBearerAuth()
@Controller('conversions')
export class ConversionsController {
  constructor(private trackingService: TrackingService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar conversão — atribui receita ao email clicado nos últimos 7 dias' })
  recordConversion(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConversionDto,
  ) {
    return this.trackingService.recordConversion(
      user.organizationId,
      dto.contact_email,
      dto.revenue,
      dto.order_id,
    );
  }
}
