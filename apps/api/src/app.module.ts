import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './shared/prisma/prisma.module';
import { RedisModule } from './shared/redis/redis.module';
import { SesModule } from './shared/ses/ses.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ListsModule } from './modules/lists/lists.module';
import { SegmentsModule } from './modules/segments/segments.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { SendingModule } from './modules/sending/sending.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DeliverabilityModule } from './modules/deliverability/deliverability.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { FormsModule } from './modules/forms/forms.module';
import { FollowupModule } from './modules/followup/followup.module';
import envValidation from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: envValidation,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    RedisModule,
    SesModule,
    AuthModule,
    ContactsModule,
    ListsModule,
    SegmentsModule,
    TemplatesModule,
    CampaignsModule,
    AutomationsModule,
    SendingModule,
    TrackingModule,
    AnalyticsModule,
    DeliverabilityModule,
    ChannelsModule,
    FormsModule,
    FollowupModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
