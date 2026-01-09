import { BadRequestException, Injectable, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  private supabaseClient: SupabaseClient;
  constructor(
  @InjectRepository(User)
  private readonly userRepository: Repository<User>,
 ){
   this.supabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
   
 }
 

 
 async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const { data, error } = await this.supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new UnauthorizedException('Credenciales inválidas');

    // Devolvemos el access_token que el frontend usará en sus cabeceras
    return {
      access_token: data.session.access_token,
      user: data.user,
    };
  }

  async register( registerDto: RegisterDto) {
   
try{
   const { email, password,role, nombre } = registerDto;
  const user = await this.userRepository.findOne({ where: { email: email.toLowerCase() } });

    if (user) {
      console.log('Usuario encontrado en DB:', user);
      // Es importante lanzar la excepción aquí para detener el proceso
      throw new BadRequestException(`El correo ${email} ya está registrado.`);
    }

  const { data, error } = await this.supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: role || "profesor",
        nombre,
      },
    },
  })
  if (error) throw new UnauthorizedException('Error en el registro: ' + error.message);

  return {
    access_token: data.session?.access_token,
    user: data.user,
  };
  }catch(error){
    throw new UnauthorizedException('Error en el registro: ' + error.message);

}
}
 async getUserFullProfile(userId: string) {
  // Simplemente retornar el userId que ya validamos en el guard
  // Si necesitas más datos, consúltalos de tu tabla de perfiles
  
  const { data: profile, error } = await this.supabaseClient
    .from('users') // Asume que tienes una tabla profiles
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    // Si no tienes tabla profiles, simplemente retorna lo básico
    return {
      userId,
      message: 'Usuario autenticado correctamente'
    };
  }

  return profile;
}

}


 
  // update(id: number, updateAuthDto: UpdateAuthDto) {
  //   return `This action updates a #${id} auth`;
  // }

 