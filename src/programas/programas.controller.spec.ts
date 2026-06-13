import { Test, TestingModule } from '@nestjs/testing';
import { ProgramasController } from './programas.controller';
import { ProgramasService } from './programas.service';

describe('ProgramasController', () => {
  let controller: ProgramasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgramasController],
      providers: [ProgramasService],
    }).compile();

    controller = module.get<ProgramasController>(ProgramasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
