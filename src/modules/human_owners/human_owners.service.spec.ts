import { Test, TestingModule } from '@nestjs/testing';
import { HumanOwnersService } from './human_owners.service';

describe('HumanOwnersService', () => {
  let service: HumanOwnersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HumanOwnersService],
    }).compile();

    service = module.get<HumanOwnersService>(HumanOwnersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
