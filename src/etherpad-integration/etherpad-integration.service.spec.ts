import { Test, TestingModule } from '@nestjs/testing';
import { EtherpadIntegrationService } from './etherpad-integration.service';

describe('EtherpadIntegrationService', () => {
  let service: EtherpadIntegrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EtherpadIntegrationService],
    }).compile();

    service = module.get<EtherpadIntegrationService>(EtherpadIntegrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
