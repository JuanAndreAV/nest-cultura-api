import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class ReportesService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  // ----------------------------------------------------------------
  // v_estado_cursos — dashboard principal
  // ----------------------------------------------------------------
  async estadoCursos(filtros?: {
    periodoId?: string;
    programa?:  string;
    activo?:    boolean;
  }): Promise<any[]> {
    let query = this.supabase.from('v_estado_cursos').select('*');

    if (filtros?.periodoId) query = query.eq('periodo_id', filtros.periodoId);
    if (filtros?.programa)  query = query.eq('programa', filtros.programa);
    if (filtros?.activo !== undefined) query = query.eq('activo', filtros.activo);

    const { data, error } = await query.order('programa').order('curso');
    if (error) throw new Error(error.message);
    return data;
  }

  // ----------------------------------------------------------------
  // v_asistencia_resumen — estado de asistencia por inscripción
  // ----------------------------------------------------------------
  async asistenciaResumen(filtros?: {
    cursoId?:   string;
    usuarioId?: string;
    estado?:    string;
  }): Promise<any[]> {
    let query = this.supabase.from('v_asistencia_resumen').select('*');

    if (filtros?.cursoId)   query = query.eq('curso_id', filtros.cursoId);
    if (filtros?.usuarioId) query = query.eq('usuario_id', filtros.usuarioId);
    if (filtros?.estado)    query = query.eq('estado_asistencia', filtros.estado);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  // ----------------------------------------------------------------
  // v_notas_resumen — estado académico por inscripción
  // ----------------------------------------------------------------
  async notasResumen(filtros?: {
    cursoId?:   string;
    usuarioId?: string;
    estado?:    string;
  }): Promise<any[]> {
    let query = this.supabase.from('v_notas_resumen').select('*');

    if (filtros?.cursoId)   query = query.eq('curso_id', filtros.cursoId);
    if (filtros?.usuarioId) query = query.eq('usuario_id', filtros.usuarioId);
    if (filtros?.estado)    query = query.eq('estado_notas', filtros.estado);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  // ----------------------------------------------------------------
  // v_programacion_aulas — calendario semanal por aula
  // ----------------------------------------------------------------
  async programacionAulas(filtros?: {
    aulaId?:    string;
    diaSemana?: string;
    periodo?:   string;
  }): Promise<any[]> {
    let query = this.supabase.from('v_programacion_aulas').select('*');

    if (filtros?.aulaId)    query = query.eq('aula_id', filtros.aulaId);
    if (filtros?.diaSemana) query = query.eq('dia_semana', filtros.diaSemana);
    if (filtros?.periodo)   query = query.eq('periodo', filtros.periodo);

    const { data, error } = await query
      .order('aula')
      .order('dia_semana')
      .order('hora_inicio');

    if (error) throw new Error(error.message);
    return data;
  }

  // ----------------------------------------------------------------
  // v_ficha_estudiante_curso — reporte individual completo
  // ----------------------------------------------------------------
  async fichaEstudianteCurso(filtros?: {
    estudianteId?: string;
    cursoId?:      string;
    inscripcionId?: string;
  }): Promise<any[]> {
    let query = this.supabase.from('v_ficha_estudiante_curso').select('*');

    if (filtros?.estudianteId)  query = query.eq('estudiante_id', filtros.estudianteId);
    if (filtros?.cursoId)       query = query.eq('curso_id', filtros.cursoId);
    if (filtros?.inscripcionId) query = query.eq('inscripcion_id', filtros.inscripcionId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  // ----------------------------------------------------------------
  // v_docentes — listado de docentes
  // ----------------------------------------------------------------
  async docentes(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('v_docentes')
      .select('*')
      .order('nombre');

    if (error) throw new Error(error.message);
    return data;
  }

  // ----------------------------------------------------------------
  // v_usuarios_completo — listado general con roles
  // ----------------------------------------------------------------
  async usuariosCompleto(filtros?: {
    esAdmin?:     boolean;
    esDocente?:   boolean;
    esEstudiante?: boolean;
    activo?:      boolean;
  }): Promise<any[]> {
    let query = this.supabase.from('v_usuarios_completo').select('*');

    if (filtros?.esAdmin     !== undefined) query = query.eq('es_admin', filtros.esAdmin);
    if (filtros?.esDocente   !== undefined) query = query.eq('es_docente', filtros.esDocente);
    if (filtros?.esEstudiante !== undefined) query = query.eq('es_estudiante', filtros.esEstudiante);
    if (filtros?.activo      !== undefined) query = query.eq('activo', filtros.activo);

    const { data, error } = await query.order('nombre');
    if (error) throw new Error(error.message);
    return data;
  }

  // ----------------------------------------------------------------
  // KPIs GENERALES — para cards del dashboard
  // ----------------------------------------------------------------
  async kpis(): Promise<any> {
    const [cursos, asistencia, notas, usuarios] = await Promise.all([
      this.supabase.from('v_estado_cursos').select('*'),
      this.supabase.from('v_asistencia_resumen').select('*'),
      this.supabase.from('v_notas_resumen').select('*'),
      this.supabase.from('v_usuarios_completo').select('*').eq('activo', true),
    ]);

    const totalCursos     = cursos.data?.length ?? 0;
    const cursosActivos   = cursos.data?.filter(c => c.activo).length ?? 0;
    const totalInscritos  = cursos.data?.reduce((s, c) => s + (c.inscritos_activos ?? 0), 0) ?? 0;
    const promedioOcupacion = totalCursos
      ? +(cursos.data!.reduce((s, c) => s + (c.porcentaje_ocupacion ?? 0), 0) / totalCursos).toFixed(1)
      : 0;

    const enRiesgoAsistencia = asistencia.data?.filter(
      a => a.estado_asistencia === 'en_riesgo' || a.estado_asistencia === 'critico'
    ).length ?? 0;

    const enRiesgoNotas = notas.data?.filter(
      n => n.estado_notas === 'en_riesgo'
    ).length ?? 0;

    const totalEstudiantes = usuarios.data?.filter(u => u.es_estudiante).length ?? 0;
    const totalDocentes    = usuarios.data?.filter(u => u.es_docente).length ?? 0;

    return {
      cursos: {
        total:            totalCursos,
        activos:          cursosActivos,
        promedioOcupacion,
      },
      inscripciones: {
        total:            totalInscritos,
        enRiesgoAsistencia,
        enRiesgoNotas,
      },
      usuarios: {
        totalEstudiantes,
        totalDocentes,
      },
    };
  }
}