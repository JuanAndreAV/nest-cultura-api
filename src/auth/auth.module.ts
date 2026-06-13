
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { PassportModule } from '@nestjs/passport';
import { SupabaseAuthGuard } from './supabase-auth.guard.ts';
import { UserRolEntity } from './entities/user-rol.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthGuard, JwtStrategy],
  imports: [
    TypeOrmModule.forFeature([User, UserRolEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  exports: [SupabaseAuthGuard, JwtStrategy],
})
export class AuthModule {}
