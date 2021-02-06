import { Test, TestingModule } from '@nestjs/testing';
import { ExternalModuleController } from './external-module.controller';

describe('ExternalModule Controller', () => {
  let controller: ExternalModuleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExternalModuleController],
    }).compile();

    controller = module.get<ExternalModuleController>(ExternalModuleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
