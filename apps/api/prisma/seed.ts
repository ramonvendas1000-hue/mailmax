import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'seed-org-1' },
    update: {},
    create: {
      id: 'seed-org-1',
      name: 'Agência Demo',
      plan: 'PRO',
      timezone: 'America/Sao_Paulo',
    },
  });

  const passwordHash = await bcrypt.hash('admin123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'Admin Demo',
      passwordHash,
      organizations: {
        create: {
          organizationId: org.id,
          role: 'OWNER',
        },
      },
    },
  });

  const list = await prisma.contactList.upsert({
    where: { id: 'seed-list-1' },
    update: {},
    create: {
      id: 'seed-list-1',
      organizationId: org.id,
      name: 'Lista Principal',
      description: 'Lista de contatos principal',
    },
  });

  const contacts = [];
  for (let i = 1; i <= 100; i++) {
    const contact = await prisma.contact.upsert({
      where: {
        organizationId_email: {
          organizationId: org.id,
          email: `contato${i}@exemplo.com`,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        email: `contato${i}@exemplo.com`,
        name: `Contato ${i}`,
        phone: `+5511999${String(i).padStart(5, '0')}`,
        status: i % 10 === 0 ? 'UNSUBSCRIBED' : 'ACTIVE',
        score: Math.floor(Math.random() * 100),
        tags: i % 3 === 0 ? ['vip', 'cliente'] : ['prospect'],
        revenue: Math.random() * 5000,
        customFields: {
          empresa: `Empresa ${i}`,
          cargo: i % 2 === 0 ? 'Gerente' : 'Diretor',
        },
        listMemberships: {
          create: { listId: list.id },
        },
      },
    });
    contacts.push(contact);
  }

  const template = await prisma.emailTemplate.upsert({
    where: { id: 'seed-template-1' },
    update: {},
    create: {
      id: 'seed-template-1',
      organizationId: org.id,
      name: 'Email de Boas-vindas',
      subject: 'Bem-vindo, {{contact.name}}!',
      previewText: 'Obrigado por se cadastrar.',
      blocks: [
        {
          id: 'block-1',
          type: 'text',
          content: '<h1>Bem-vindo, {{contact.name}}!</h1><p>Estamos felizes em ter você conosco.</p>',
        },
        {
          id: 'block-2',
          type: 'button',
          content: 'Começar Agora',
          url: 'https://exemplo.com/start',
        },
      ],
      htmlContent: `<html><body><h1>Bem-vindo!</h1><p>{{unsubscribe_link}}</p></body></html>`,
      status: 'ACTIVE',
    },
  });

  const campaign1 = await prisma.campaign.upsert({
    where: { id: 'seed-campaign-1' },
    update: {},
    create: {
      id: 'seed-campaign-1',
      organizationId: org.id,
      name: 'Campanha de Boas-vindas',
      subject: 'Bem-vindo à nossa plataforma!',
      fromName: 'Agência Demo',
      fromEmail: 'noreply@demo.com',
      templateId: template.id,
      status: 'SENT',
      sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lists: { create: { listId: list.id } },
      stats: {
        create: {
          sent: 90,
          delivered: 88,
          opened: 45,
          uniqueOpened: 40,
          clicked: 20,
          uniqueClicked: 18,
          bounced: 2,
          spamComplaints: 0,
          unsubscribed: 1,
          revenue: 2500,
        },
      },
    },
  });

  const campaign2 = await prisma.campaign.upsert({
    where: { id: 'seed-campaign-2' },
    update: {},
    create: {
      id: 'seed-campaign-2',
      organizationId: org.id,
      name: 'Newsletter Mensal - Maio 2026',
      subject: 'Novidades do mês de Maio',
      fromName: 'Agência Demo',
      fromEmail: 'noreply@demo.com',
      templateId: template.id,
      status: 'DRAFT',
      lists: { create: { listId: list.id } },
    },
  });

  await prisma.automation.upsert({
    where: { id: 'seed-auto-1' },
    update: {},
    create: {
      id: 'seed-auto-1',
      organizationId: org.id,
      name: 'Sequência de Boas-vindas',
      status: 'ACTIVE',
      nodes: [
        { id: 'n1', type: 'trigger_list_join', config: { listId: list.id }, position: { x: 100, y: 100 } },
        { id: 'n2', type: 'action_send_email', config: { templateId: template.id, subject: 'Bem-vindo!' }, position: { x: 100, y: 250 } },
        { id: 'n3', type: 'wait_duration', config: { duration: 3, unit: 'days' }, position: { x: 100, y: 400 } },
        { id: 'n4', type: 'condition_if_else', config: { field: 'score', operator: 'greater_than', value: 50 }, position: { x: 100, y: 550 } },
        { id: 'n5', type: 'action_update_score', config: { delta: 10 }, position: { x: 0, y: 700 } },
        { id: 'n6', type: 'action_add_tag', config: { tag: 'engajado' }, position: { x: 200, y: 700 } },
      ],
      edges: [
        { source: 'n1', target: 'n2' },
        { source: 'n2', target: 'n3' },
        { source: 'n3', target: 'n4' },
        { source: 'n4', target: 'n5', condition: 'true' },
        { source: 'n4', target: 'n6', condition: 'false' },
      ],
    },
  });

  await prisma.ipWarmup.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      currentWeek: 1,
      dailySentToday: 0,
    },
  });

  console.log('Seed concluído com sucesso!');
  console.log(`  Organização: ${org.name} (${org.id})`);
  console.log(`  Usuário: ${user.email} / senha: admin123`);
  console.log(`  Contatos: 100 criados`);
  console.log(`  Campanhas: 2 criadas`);
  console.log(`  Automação: 1 criada`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
