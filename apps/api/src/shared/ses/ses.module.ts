import { Global, Module } from '@nestjs/common';
import { SesService } from './ses.service';

@Global()
@Module({
  providers: [SesService],
  exports: [SesService],
})
export class SesModule {}
