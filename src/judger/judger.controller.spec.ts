import { Test, TestingModule } from '@nestjs/testing';
import { JudgerController } from './judger.controller';

describe('Judger Controller', () => {
  let controller: JudgerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JudgerController],
    }).compile();

    controller = module.get<JudgerController>(JudgerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
