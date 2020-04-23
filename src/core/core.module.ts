import { Module } from '@nestjs/common';
import { CoreService } from './core.service';
import { AirtableIntegrationModule } from '../airtable-integration';
import { EtherpadIntegrationModule } from '../etherpad-integration';

@Module({
  imports: [
    AirtableIntegrationModule,
    EtherpadIntegrationModule
  ],
  providers: [CoreService]
})
export class CoreModule { }
