import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { FormsService } from './forms.service';
import { Public } from '../../shared/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../shared/decorators/current-user.decorator';

@ApiTags('forms')
@Controller('forms')
export class FormsController {
  constructor(private formsService: FormsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar formulários' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.formsService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar formulário' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.formsService.findOne(user.organizationId, id);
  }

  @Get(':id/embed')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Snippet HTML para embedar' })
  embed(@Param('id') id: string) {
    return this.formsService.getEmbedCode(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar formulário' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: any) {
    return this.formsService.create(user.organizationId, dto);
  }

  @Post(':id/submit')
  @Public()
  @ApiOperation({ summary: 'Submeter formulário (público)' })
  submit(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: FastifyRequest,
  ) {
    return this.formsService.submit(id, data, req.ip ?? '');
  }
}
