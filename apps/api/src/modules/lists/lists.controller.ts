import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ListsService } from './lists.service';
import { CurrentUser, JwtPayload } from '../../shared/decorators/current-user.decorator';

class CreateListDto {
  @ApiProperty() @IsString() @MinLength(1) name: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() description?: string;
}

class AddContactsDto {
  @ApiProperty({ type: [String] }) @IsArray() contactIds: string[];
}

@ApiTags('lists')
@ApiBearerAuth()
@Controller('lists')
export class ListsController {
  constructor(private listsService: ListsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as listas' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.listsService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar lista por ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.listsService.findOne(user.organizationId, id);
  }

  @Get(':id/contacts')
  @ApiOperation({ summary: 'Contatos de uma lista' })
  getContacts(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listsService.getContacts(user.organizationId, id, page ? Number(page) : undefined, limit ? Number(limit) : undefined);
  }

  @Post()
  @ApiOperation({ summary: 'Criar lista' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateListDto) {
    return this.listsService.create(user.organizationId, dto);
  }

  @Post(':id/contacts')
  @ApiOperation({ summary: 'Adicionar contatos à lista' })
  addContacts(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddContactsDto,
  ) {
    return this.listsService.addContacts(user.organizationId, id, dto.contactIds);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover lista' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.listsService.remove(user.organizationId, id);
  }

  @Delete(':id/contacts/:contactId')
  @ApiOperation({ summary: 'Remover contato da lista' })
  removeContact(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.listsService.removeContact(user.organizationId, id, contactId);
  }
}
