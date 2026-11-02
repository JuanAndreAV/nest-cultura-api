import { Controller, Get, Post, Body, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const opcionesCookie = (path: string, maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path,
  maxAge,
});
const HORA = 60 * 60 * 1000;
const MES  = 30 * 24 * HORA;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { access_token, refresh_token, user } = await this.authService.login(dto);
    res.cookie('access_token', access_token, opcionesCookie('/', HORA));
    res.cookie('refresh_token', refresh_token, opcionesCookie('/api/auth', MES));
    return { user };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException();
    const s = await this.authService.refresh(token);
    res.cookie('access_token', s.access_token, opcionesCookie('/', HORA));
    res.cookie('refresh_token', s.refresh_token, opcionesCookie('/api/auth', MES));
    return { ok: true };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/auth' });
    return { ok: true };
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@Req() req: any) {
    return req.user; // JwtStrategy ya devuelve el perfil completo con roles
  }
}