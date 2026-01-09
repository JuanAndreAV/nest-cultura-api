
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { SupabaseAuthGuard } from './supabase-auth.guard.ts';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthGuard],
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  exports: [SupabaseAuthGuard],
})
export class AuthModule {}
