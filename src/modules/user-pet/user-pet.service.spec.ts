import { Test, TestingModule } from '@nestjs/testing';
import { UserPetService } from './user-pet.service';

describe('UserPetService', () => {
  let service: UserPetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserPetService],
    }).compile();

    service = module.get<UserPetService>(UserPetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
