import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from '../auth/entities/user.entity';

interface EstudianteQ10 {
  Codigo_estudiante: string;
  Abreviatura_tipo_identificacion: string;
  Numero_identificacion: string;
  Primer_nombre: string;
  Segundo_nombre: string;
  Primer_apellido: string;
  Segundo_apellido: string;
  Fecha_nacimiento: string;
  Telefono: string;
  Celular: string;
  Email: string;
  Direccion: string;
  Nombre_pais_residencia: string;
  Nombre_departamento_residencia: string;
  Nombre_municipio_residencia: string;
  Nombre_barrio: string | null;
  Nombre_pais_nacimiento: string | null;
  Nombre_departamento_nacimiento: string | null;
  Nombre_municipio_nacimiento: string | null;
  Genero: string;
  Preguntas_personalizadas: Array<{
    Pregunta: string;
    Respuesta: Array<{ Respuesta: string }>;
  }>;
}

export interface ResultadoMigracion {
  total: number;
  creados: number;
  actualizados: number;
  errores: number;
  detalle_errores: string[];
}

@Injectable()
export class MigrationService {
  readonly logger = new Logger(MigrationService.name);
  private supabase: SupabaseClient;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async sincronizarEstudiantes(): Promise<ResultadoMigracion> {
    const { data, error } = await this.supabase.auth.admin.listUsers();
    if (error) {
      this.logger.error(`Key inválida: ${error.message}`);
      throw new Error('SUPABASE_SERVICE_ROLE_KEY inválida');
    }
    this.logger.log(`✓ Key válida — usuarios en Auth: ${data.users.length}`);
    
    const resultados: ResultadoMigracion = {
      total: 0,
      creados: 0,
      actualizados: 0,
      errores: 0,
      detalle_errores: [],
    };

    const estudiantes = await this.fetchTodosLosEstudiantes();
    resultados.total = estudiantes.length;
    this.logger.log(`Total obtenidos de Q10: ${estudiantes.length}`);

    const LOTE = 50;
    for (let i = 0; i < estudiantes.length; i += LOTE) {
      const lote = estudiantes.slice(i, i + LOTE);
      this.logger.log(`Lote ${Math.floor(i / LOTE) + 1} — ${i + 1} a ${i + lote.length}`);

     /* await Promise.all(
        lote.map(e => this.procesarEstudiante(e, resultados)),
      );*/
      for (const estudiante of lote) {
      await this.procesarEstudiante(estudiante, resultados);
    }

      // Control de flujo para no saturar las conexiones
      await this.sleep(600);
    }

    return resultados;
  }

 private async procesarEstudiante(
  est: EstudianteQ10,
  resultados: ResultadoMigracion,
): Promise<void> {
  try {
    const emailReal  = this.limpiarEmail(est.Email);
    const esFicticio = !emailReal;
    const email      = emailReal ?? this.generarEmailFicticio(est);

    // Mapeo de preguntas personalizadas para campos comunes (zona, enfoque)
    const preguntas = this.mapearPreguntas(est.Preguntas_personalizadas);

    // Buscar si ya existe por email o documento
    const usuarioExistente = await this.userRepository.findOne({
      where: [
        { email },
        ...(est.Numero_identificacion ? [{ documento: est.Numero_identificacion }] : []),
      ],
    });

    let userId: string;

    if (usuarioExistente) {
      // — ACTUALIZAR —
      userId = usuarioExistente.id;

      // Preservar roles existentes y asegurar que incluya 'estudiante'
      const rolesPrevios = usuarioExistente.roles || [];
      const rolesActualizados = Array.from(
        new Set([...rolesPrevios, 'estudiante']),
      );

      await this.userRepository.update(userId, {
        nombre:                 this.capitalizar(est.Primer_nombre),
        segundoNombre:          this.capitalizar(est.Segundo_nombre) || null,
        apellido:               this.capitalizar(est.Primer_apellido),
        segundoApellido:        this.capitalizar(est.Segundo_apellido) || null,
        documento:              est.Numero_identificacion || null,
        tipoIdentificacion:     est.Abreviatura_tipo_identificacion || null,
        fechaNacimiento:        est.Fecha_nacimiento ? new Date(est.Fecha_nacimiento) : null,
        telefono:               est.Celular || est.Telefono || null,
        genero:                 est.Genero || null,
        direccion:              est.Direccion || null,
        barrio:                 est.Nombre_barrio || null,
        municipio:              est.Nombre_municipio_residencia || null,
        departamento:           est.Nombre_departamento_residencia || null,
        pais:                   est.Nombre_pais_residencia || 'Colombia',
        municipioNacimiento:    est.Nombre_municipio_nacimiento || null,
        departamentoNacimiento: est.Nombre_departamento_nacimiento || null,
        paisNacimiento:         est.Nombre_pais_nacimiento || null,
        zonaResidencia:         preguntas.zona_residencia || null,
        enfoquePoblacional:     preguntas.enfoque_poblacional || null,
        roles:                  rolesActualizados,
        ...(usuarioExistente.emailFicticio && emailReal
          ? { email: emailReal, emailFicticio: false }
          : {}),
      });

      resultados.actualizados++;
      this.logger.verbose(`↺ Actualizado: ${email}`);

    } else {
      // — CREAR —
      // 1. Crear en Supabase Auth
      const { data: authData, error: authError } =
        await this.supabase.auth.admin.createUser({
          email,
          password: est.Numero_identificacion || 'CasaCultura2026*',
          email_confirm: true,
          app_metadata: {
            provider: 'email',
            providers: ['email'],
          },
          user_metadata: {
            roles:  ['estudiante'],
            nombre: this.capitalizar(est.Primer_nombre),
          },
        });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          this.logger.warn(`Desincronizado en Auth: ${email}`);
          resultados.actualizados++;
          return;
        }
        throw new Error(`Auth: ${authError.message}`);
      }

      userId = authData.user.id;

      // 2. INSERTAR DIRECTAMENTE en public.users
      const nuevoUsuario = this.userRepository.create({
        id:                     userId,
        email:                  email,
        nombre:                 this.capitalizar(est.Primer_nombre),
        segundoNombre:          this.capitalizar(est.Segundo_nombre) || null,
        apellido:               this.capitalizar(est.Primer_apellido),
        segundoApellido:        this.capitalizar(est.Segundo_apellido) || null,
        documento:              est.Numero_identificacion || null,
        tipoIdentificacion:     est.Abreviatura_tipo_identificacion || null,
        fechaNacimiento:        est.Fecha_nacimiento ? new Date(est.Fecha_nacimiento) : null,
        telefono:               est.Celular || est.Telefono || null,
        genero:                 est.Genero || null,
        direccion:              est.Direccion || null,
        barrio:                 est.Nombre_barrio || null,
        municipio:              est.Nombre_municipio_residencia || null,
        departamento:           est.Nombre_departamento_residencia || null,
        pais:                   est.Nombre_pais_residencia || 'Colombia',
        municipioNacimiento:    est.Nombre_municipio_nacimiento || null,
        departamentoNacimiento: est.Nombre_departamento_nacimiento || null,
        paisNacimiento:         est.Nombre_pais_nacimiento || null,
        zonaResidencia:         preguntas.zona_residencia || null,
        enfoquePoblacional:     preguntas.enfoque_poblacional || null,
        emailFicticio:          esFicticio,
        activo:                 true,
        roles:                  ['estudiante'],
      });

      await this.userRepository.save(nuevoUsuario);
     
      resultados.creados++;
      this.logger.verbose(`✓ Creado de forma directa: ${email}${esFicticio ? ' (ficticio)' : ''}`);
    }

    // 3. Perfil extendido — solo metadatos específicos de estudiante
    await this.dataSource.query(
      `INSERT INTO perfiles_estudiante (
        usuario_id, codigo_q10, migrado_de_q10, fecha_migracion, updated_at
      ) VALUES ($1, $2, true, NOW(), NOW())
      ON CONFLICT (usuario_id) DO UPDATE SET
        codigo_q10 = EXCLUDED.codigo_q10,
        updated_at = NOW()`,
      [
        userId,
        est.Codigo_estudiante,
      ],
    );

  } catch (error) {
    resultados.errores++;
    resultados.detalle_errores.push(
      `[${est.Codigo_estudiante}] ${est.Primer_nombre} ${est.Primer_apellido}: ${error instanceof Error ? error.message : String(error)}`,
    );
    this.logger.error(`✗ [${est.Codigo_estudiante}]: ${error instanceof Error ? error.message : String(error)}`);
  }
}
  async fetchTodosLosEstudiantes(): Promise<EstudianteQ10[]> {
    const todos: EstudianteQ10[] = [];
    const LIMIT = 2000;
    let offset = 0;

    const baseParams = {
      Fecha_inicio_matricula:           process.env.Q10_FECHA_INICIO ?? '2026-01-01',
      Fecha_fin_matricula:              process.env.Q10_FECHA_FIN ?? new Date().toISOString().split('T')[0],
      Estado:                           'T',
      Incluir_info_adicional:           'false',
      Incluir_info_matricula:           'true',
      Incluir_info_academica:           'false',
      Incluir_info_laboral:             'false',
      Incluir_preguntas_personalizadas: 'true',
      Incluir_info_familiares:          'false',
    };

    while (true) {
      const params = new URLSearchParams({
        ...baseParams,
        Limit:  String(LIMIT),
        Offset: String(offset),
      });

      const response = await fetch(
        `${process.env.Q10_API_URL}/comunidad-excel/estudiantes?${params}`,
        {
          headers: {
            'Api-key':    process.env.Q10_API_KEY!,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Q10 ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const registros: EstudianteQ10[] = Array.isArray(data)
        ? data
        : (data.data ?? data.estudiantes ?? data.Estudiantes ?? []);

      if (!registros.length) break;

      todos.push(...registros);
      this.logger.log(`offset=${offset} → ${registros.length} | total=${todos.length}`);

      if (registros.length < LIMIT) break;
      offset += LIMIT;
      await this.sleep(300);
    }

    return todos;
  }

  // ----------------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------------
  private generarEmailFicticio(est: EstudianteQ10): string {
    const id = est.Numero_identificacion || est.Codigo_estudiante;
    return `cc-${id}@casacultura.local`;
  }

  private limpiarEmail(email: string): string | null {
    if (!email || email === '0' || !email.includes('@')) return null;
    return email.toLowerCase().trim();
  }

  private mapearPreguntas(preguntas: EstudianteQ10['Preguntas_personalizadas']) {
    const get = (keyword: string): string | null =>
      preguntas
        ?.find(p => p.Pregunta.toLowerCase().includes(keyword.toLowerCase()))
        ?.Respuesta?.[0]?.Respuesta ?? null;

    return {
      zona_residencia:     get('zona de residencia'),
      enfoque_poblacional: get('enfoque poblacional'),
    };
  }

  capitalizar(texto: string): string {
    if (!texto?.trim()) return '';
    return texto
      .toLowerCase()
      .split(' ')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ')
      .trim();
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}