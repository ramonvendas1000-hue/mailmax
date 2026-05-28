import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentUser, JwtPayload } from '../../shared/decorators/current-user.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Métricas gerais do período' })
  overview(
    @CurrentUser() user: JwtPayload,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getOverview(user.organizationId, days ? Number(days) : undefined);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Performance por campanha' })
  campaigns(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getCampaignsPerformance(user.organizationId, page ? Number(page) : undefined, limit ? Number(limit) : undefined);
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Top contatos por score/receita' })
  contacts(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getTopContacts(user.organizationId);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Receita atribuída por email/fluxo' })
  revenue(
    @CurrentUser() user: JwtPayload,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getRevenueAnalytics(user.organizationId, days ? Number(days) : undefined);
  }

  @Get('deliverability')
  @ApiOperation({ summary: 'Taxas de bounce, spam, abertura' })
  deliverability(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getDeliverabilityStats(user.organizationId);
  }
}
