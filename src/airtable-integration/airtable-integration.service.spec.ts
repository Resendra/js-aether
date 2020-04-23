import { Test, TestingModule } from '@nestjs/testing';
import { AirtableIntegrationService } from './airtable-integration.service';

describe('AirtableIntegrationService', () => {
  let service: AirtableIntegrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AirtableIntegrationService],
    }).compile();

    service = module.get<AirtableIntegrationService>(AirtableIntegrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
