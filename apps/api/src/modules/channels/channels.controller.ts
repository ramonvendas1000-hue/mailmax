import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import { CurrentUser, JwtPayload } from '../../shared/decorators/current-user.decorator';

@ApiTags('channels')
@ApiBearerAuth()
@Controller('channels')
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar canais configurados' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.channelsService.findAll(user.organizationId);
  }

  @Post('sms')
  @ApiOperation({ summary: 'Configurar canal SMS (Twilio)' })
  configureSms(@CurrentUser() user: JwtPayload, @Body() config: any) {
    return this.channelsService.configureSms(user.organizationId, config);
  }

  @Post('whatsapp')
  @ApiOperation({ summary: 'Configurar canal WhatsApp' })
  configureWhatsapp(@CurrentUser() user: JwtPayload, @Body() config: any) {
    return this.channelsService.configureWhatsapp(user.organizationId, config);
  }
}
