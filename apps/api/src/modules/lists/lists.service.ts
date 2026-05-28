import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class ListsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const lists = await this.prisma.contactList.findMany({
      where: { organizationId, deletedAt: null },
      include: { _count: { select: { contacts: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: lists };
  }

  async findOne(organizationId: string, id: string) {
    const list = await this.prisma.contactList.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { _count: { select: { contacts: true } } },
    });
    if (!list) throw new NotFoundException('Lista não encontrada');
    return { success: true, data: list };
  }

  async create(organizationId: string, dto: { name: string; description?: string }) {
    const list = await this.prisma.contactList.create({
      data: { organizationId, name: dto.name, description: dto.description },
    });
    return { success: true, data: list };
  }

  async remove(organizationId: string, id: string) {
    const list = await this.prisma.contactList.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!list) throw new NotFoundException('Lista não encontrada');

    await this.prisma.contactList.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true, data: { deleted: true } };
  }

  async addContacts(organizationId: string, listId: string, contactIds: string[]) {
    const list = await this.prisma.contactList.findFirst({
      where: { id: listId, organizationId, deletedAt: null },
    });
    if (!list) throw new NotFoundException('Lista não encontrada');

    const contacts = await this.prisma.contact.findMany({
      where: { id: { in: contactIds }, organizationId, deletedAt: null },
      select: { id: true },
    });

    const data = contacts.map((c) => ({ listId, contactId: c.id }));

    await this.prisma.listContact.createMany({ data, skipDuplicates: true });

    return { success: true, data: { added: contacts.length } };
  }

  async removeContact(organizationId: string, listId: string, contactId: string) {
    const list = await this.prisma.contactList.findFirst({
      where: { id: listId, organizationId, deletedAt: null },
    });
    if (!list) throw new NotFoundException('Lista não encontrada');

    await this.prisma.listContact.deleteMany({
      where: { listId, contactId },
    });
    return { success: true, data: { removed: true } };
  }

  async getContacts(
    organizationId: string,
    listId: string,
    page = 1,
    limit = 50,
  ) {
    const list = await this.prisma.contactList.findFirst({
      where: { id: listId, organizationId, deletedAt: null },
    });
    if (!list) throw new NotFoundException('Lista não encontrada');

    const skip = (page - 1) * limit;
    const [memberships, total] = await Promise.all([
      this.prisma.listContact.findMany({
        where: { listId },
        include: {
          contact: {
            select: {
              id: true,
              email: true,
              name: true,
              status: true,
              score: true,
              tags: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { addedAt: 'desc' },
      }),
      this.prisma.listContact.count({ where: { listId } }),
    ]);

    return {
      success: true,
      data: memberships.map((m) => m.contact),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
