import { Module } from '@nestjs/common';
import { AirtableIntegrationService } from './airtable-integration.service';

@Module({
    providers: [AirtableIntegrationService],
    exports: [AirtableIntegrationService]
})
export class AirtableIntegrationModule { }
