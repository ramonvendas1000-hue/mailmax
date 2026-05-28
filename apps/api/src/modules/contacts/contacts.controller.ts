import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactQueryDto } from './dto/contact-query.dto';
import { CurrentUser, JwtPayload } from '../../shared/decorators/current-user.decorator';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar contatos com filtros e paginação' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: ContactQueryDto) {
    return this.contactsService.findAll(user.organizationId, query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar contatos em CSV' })
  async export(@CurrentUser() user: JwtPayload, @Res() res: FastifyReply) {
    const csv = await this.contactsService.exportContacts(user.organizationId);
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=contacts.csv');
    res.send(csv);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar contato por ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.contactsService.findOne(user.organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar contato manualmente' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateContactDto) {
    return this.contactsService.create(user.organizationId, dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Importar contatos via CSV/XLSX' })
  @ApiConsumes('multipart/form-data')
  async import(@CurrentUser() user: JwtPayload, @Res() res: FastifyReply) {
    const request = (res as any).request as any;
    const data = await request.file();
    if (!data) {
      return res.status(400).send({ success: false, error: { code: 400, message: 'Arquivo não enviado' } });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const result = await this.contactsService.importContacts(
      user.organizationId,
      buffer,
      data.mimetype,
    );
    res.send(result);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar contato' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover contato (soft delete)' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.contactsService.remove(user.organizationId, id);
  }
}
