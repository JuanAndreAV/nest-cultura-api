import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, UseGuards, Request, UnauthorizedException} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SupabaseAuthGuard } from './supabase-auth.guard.ts';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  create(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto)
  }

  @UseGuards(SupabaseAuthGuard) // ✅ Cambiado el nombre
  @Get('profile')
  async getProfile(@Request() req) {
    //console.log('Usuario en Request:', req.user);

    if (!req.user) {
      throw new UnauthorizedException('No se pudo extraer el usuario del token');
    }

    const userId = req.user.userId;
    return await this.authService.getUserFullProfile(userId);
  }

  @Get()
  findAll() {
    return "holi";
  }

 

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
  //   return this.authService.update(+id, updateAuthDto);
  // }

 
}
