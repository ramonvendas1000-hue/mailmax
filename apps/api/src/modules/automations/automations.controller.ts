import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AutomationsService } from './automations.service';
import { CurrentUser, JwtPayload } from '../../shared/decorators/current-user.decorator';

@ApiTags('automations')
@ApiBearerAuth()
@Controller('automations')
export class AutomationsController {
  constructor(private automationsService: AutomationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar automações' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.automationsService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar automação' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.automationsService.findOne(user.organizationId, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Métricas da automação' })
  getStats(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.automationsService.getStats(user.organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar automação' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: any) {
    return this.automationsService.create(user.organizationId, dto);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Ativar automação' })
  activate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.automationsService.activate(user.organizationId, id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pausar automação' })
  pause(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.automationsService.pause(user.organizationId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar nós e conexões' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.automationsService.update(user.organizationId, id, dto);
  }
}
