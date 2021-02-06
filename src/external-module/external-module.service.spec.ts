import { Test, TestingModule } from '@nestjs/testing';
import { ExternalModuleService } from './external-module.service';

describe('ExternalModuleService', () => {
  let service: ExternalModuleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExternalModuleService],
    }).compile();

    service = module.get<ExternalModuleService>(ExternalModuleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
