import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CurrentUser, JwtPayload } from '../../shared/decorators/current-user.decorator';

class CreateTemplateDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() subject: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() previewText?: string;
  @ApiProperty({ type: [Object] }) @IsArray() blocks: any[];
}

class UpdateTemplateDto {
  @ApiProperty({ required: false }) @IsString() @IsOptional() name?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() subject?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() previewText?: string;
  @ApiProperty({ required: false, type: [Object] }) @IsArray() @IsOptional() blocks?: any[];
}

class SendTestDto {
  @ApiProperty() @IsEmail() email: string;
}

@ApiTags('templates')
@ApiBearerAuth()
@Controller('templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar templates' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.templatesService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar template por ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.templatesService.findOne(user.organizationId, id);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Preview HTML renderizado' })
  preview(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.templatesService.preview(user.organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar template' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(user.organizationId, dto);
  }

  @Post(':id/send-test')
  @ApiOperation({ summary: 'Enviar email de teste' })
  sendTest(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SendTestDto,
  ) {
    return this.templatesService.sendTest(user.organizationId, id, dto.email);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar template' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(user.organizationId, id, dto);
  }
}
