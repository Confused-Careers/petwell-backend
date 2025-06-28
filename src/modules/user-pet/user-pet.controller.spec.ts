import { Test, TestingModule } from '@nestjs/testing';
import { UserPetController } from './user-pet.controller';

describe('UserPetController', () => {
  let controller: UserPetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserPetController],
    }).compile();

    controller = module.get<UserPetController>(UserPetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
