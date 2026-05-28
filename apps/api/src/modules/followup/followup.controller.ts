import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsArray, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FollowupService } from './followup.service';
import { CurrentUser, JwtPayload } from '../../shared/decorators/current-user.decorator';

class CreateSequenceDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() description?: string;
  @ApiProperty() @IsString() fromName: string;
  @ApiProperty() @IsString() fromEmail: string;
  @ApiProperty({ required: false }) @IsInt() @Min(1) @IsOptional() waitHours?: number;
  @ApiProperty({ required: false, minimum: 1, maximum: 10 }) @IsInt() @Min(1) @Max(10) @IsOptional() maxSteps?: number;
}

class AddStepDto {
  @ApiProperty() @IsString() subject: string;
  @ApiProperty() @IsString() body: string;
  @ApiProperty({ required: false }) @IsInt() @Min(1) @IsOptional() delayHours?: number;
}

class EnrollDto {
  @ApiProperty({ type: [String] }) @IsArray() contactIds: string[];
}

@ApiTags('followup')
@ApiBearerAuth()
@Controller('followup')
export class FollowupController {
  constructor(private followupService: FollowupService) {}

  @Get()
  @ApiOperation({ summary: 'Listar sequências de follow-up' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.followupService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar sequência com steps' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.followupService.findOne(user.organizationId, id);
  }

  @Get(':id/enrollments')
  @ApiOperation({ summary: 'Ver contatos inscritos' })
  getEnrollments(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.followupService.getEnrollments(user.organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar sequência de follow-up' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSequenceDto) {
    return this.followupService.create(user.organizationId, dto);
  }

  @Post(':id/steps')
  @ApiOperation({ summary: 'Adicionar follow-up à sequência (máx. 10)' })
  addStep(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: AddStepDto) {
    return this.followupService.addStep(user.organizationId, id, dto);
  }

  @Delete(':id/steps/:stepId')
  @ApiOperation({ summary: 'Remover um follow-up' })
  deleteStep(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('stepId') stepId: string) {
    return this.followupService.deleteStep(user.organizationId, id, stepId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Ativar sequência' })
  activate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.followupService.activate(user.organizationId, id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pausar sequência' })
  pause(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.followupService.pause(user.organizationId, id);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Inscrever contatos na sequência' })
  enroll(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: EnrollDto) {
    return this.followupService.enroll(user.organizationId, id, dto.contactIds);
  }
}
