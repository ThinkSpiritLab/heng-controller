import { Test, TestingModule } from '@nestjs/testing';
import { JudgerService } from './judger.service';

describe('JudgerService', () => {
  let service: JudgerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JudgerService],
    }).compile();

    service = module.get<JudgerService>(JudgerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
