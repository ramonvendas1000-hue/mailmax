import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SegmentsService } from './segments.service';
import { CurrentUser, JwtPayload } from '../../shared/decorators/current-user.decorator';

class ConditionDto {
  @ApiProperty() @IsString() field: string;
  @ApiProperty() @IsString() operator: string;
  @ApiProperty() value: any;
}

class CreateSegmentDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ type: [ConditionDto] }) @IsArray() conditions: ConditionDto[];
  @ApiProperty({ required: false, enum: ['AND', 'OR'] })
  @IsOptional()
  @IsEnum(['AND', 'OR'])
  conditionLogic?: 'AND' | 'OR';
}

@ApiTags('segments')
@ApiBearerAuth()
@Controller('segments')
export class SegmentsController {
  constructor(private segmentsService: SegmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar segmentos' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.segmentsService.findAll(user.organizationId);
  }

  @Get('rfm')
  @ApiOperation({ summary: 'Segmentos RFM automáticos' })
  getRfm(@CurrentUser() user: JwtPayload) {
    return this.segmentsService.getRfmSegments(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar segmento' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.segmentsService.findOne(user.organizationId, id);
  }

  @Get(':id/count')
  @ApiOperation({ summary: 'Contar contatos no segmento' })
  count(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.segmentsService.countContacts(user.organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar segmento dinâmico' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSegmentDto) {
    return this.segmentsService.create(user.organizationId, dto as any);
  }
}
