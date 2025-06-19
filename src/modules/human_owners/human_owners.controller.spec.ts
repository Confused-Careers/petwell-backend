import { Test, TestingModule } from '@nestjs/testing';
import { HumanOwnersController } from './human_owners.controller';

describe('HumanOwnersController', () => {
  let controller: HumanOwnersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HumanOwnersController],
    }).compile();

    controller = module.get<HumanOwnersController>(HumanOwnersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
