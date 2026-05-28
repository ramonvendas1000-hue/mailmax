import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DeliverabilityService } from './deliverability.service';
import { CurrentUser, JwtPayload } from '../../shared/decorators/current-user.decorator';

@ApiTags('deliverability')
@ApiBearerAuth()
@Controller('deliverability')
export class DeliverabilityController {
  constructor(private deliverabilityService: DeliverabilityService) {}

  @Get('health')
  @ApiOperation({ summary: 'Score geral de entregabilidade' })
  health(@CurrentUser() user: JwtPayload) {
    return this.deliverabilityService.getHealth(user.organizationId);
  }

  @Get('dns/:domain')
  @ApiOperation({ summary: 'Verificar SPF/DKIM/DMARC de um domínio' })
  checkDns(@Param('domain') domain: string) {
    return this.deliverabilityService.checkDns(domain);
  }

  @Get('warmup')
  @ApiOperation({ summary: 'Status do warmup de IP' })
  warmup(@CurrentUser() user: JwtPayload) {
    return this.deliverabilityService.getWarmupStatus(user.organizationId);
  }

  @Post('validate-list')
  @ApiOperation({ summary: 'Validar lista antes de disparo' })
  validateList(@CurrentUser() user: JwtPayload, @Body() dto: { listId: string }) {
    return this.deliverabilityService.validateList(user.organizationId, dto.listId);
  }
}
