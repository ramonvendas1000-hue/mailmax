import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEmail, IsDateString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CurrentUser, JwtPayload } from '../../shared/decorators/current-user.decorator';

class CreateCampaignDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() subject: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() previewText?: string;
  @ApiProperty() @IsString() fromName: string;
  @ApiProperty() @IsEmail() fromEmail: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() templateId?: string;
  @ApiProperty({ required: false, type: [String] }) @IsArray() @IsOptional() listIds?: string[];
  @ApiProperty({ required: false, type: [String] }) @IsArray() @IsOptional() segmentIds?: string[];
}

class ScheduleDto {
  @ApiProperty() @IsDateString() scheduledAt: string;
}

class AbTestDto {
  @ApiProperty() @IsObject() config: any;
}

@ApiTags('campaigns')
@ApiBearerAuth()
@Controller('campaigns')
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar campanhas' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.campaignsService.findAll(user.organizationId, page ? Number(page) : undefined, limit ? Number(limit) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar campanha por ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.campaignsService.findOne(user.organizationId, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Métricas em tempo real' })
  getStats(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.campaignsService.getStats(user.organizationId, id);
  }

  @Get(':id/reach')
  @ApiOperation({ summary: 'Estimativa de alcance' })
  estimateReach(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.campaignsService.estimateReach(user.organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar campanha' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(user.organizationId, dto);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Disparar campanha imediatamente' })
  send(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.campaignsService.send(user.organizationId, id);
  }

  @Post(':id/schedule')
  @ApiOperation({ summary: 'Agendar envio' })
  schedule(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ScheduleDto,
  ) {
    return this.campaignsService.schedule(user.organizationId, id, new Date(dto.scheduledAt));
  }

  @Post(':id/ab-test')
  @ApiOperation({ summary: 'Configurar A/B test' })
  abTest(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AbTestDto,
  ) {
    return this.campaignsService.configureAbTest(user.organizationId, id, dto.config);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar campanha' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.campaignsService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover campanha' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.campaignsService.remove(user.organizationId, id);
  }
}
