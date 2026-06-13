import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProgramasService } from './programas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UseGuards } from '@nestjs/common'; 
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateProgramaDto } from './dto/create-programa.dto';
import { UpdateProgramaDto } from './dto/update-programa.dto';

@Controller('programas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgramasController {
  constructor(private readonly programasService: ProgramasService) {}

  @Post()
  create(@Body() createProgramaDto: CreateProgramaDto) {
    return this.programasService.create(createProgramaDto);
  }

  @Get()
  @Roles('admin', 'docente', 'estudiante') // Solo usuarios con estos roles pueden acceder
  findAll(@CurrentUser() user: any) {
    return user; // Solo para verificar que el decorador @CurrentUser funciona
    //return this.programasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.programasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProgramaDto: UpdateProgramaDto) {
    return this.programasService.update(+id, updateProgramaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.programasService.remove(+id);
  }
}
