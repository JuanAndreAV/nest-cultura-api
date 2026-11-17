import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DataSource } from 'typeorm';

type Conteo = { etiqueta: string; total: number };

// Ciclos de vida (Ley 1622 de 2013 / enfoque de curso de vida)
const CICLOS_VIDA = [
  'Primera infancia (0-5)',
  'Infancia (6-11)',
  'Adolescencia (12-17)',
  'Juventud (18-28)',
  'Adultez (29-59)',
  'Persona mayor (60+)',
  'Sin dato',
];

@Injectable()
export class ReportesService {
  private supabase: SupabaseClient;

  constructor(private readonly dataSource: DataSource) {
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
  // ANALÍTICA — población atendida y comportamiento de inscripciones
  // Sin periodoId: periodos activos (o inscripciones de los últimos 12 meses).
  // ----------------------------------------------------------------
  async analitica(periodoId?: string) {
    const p = [periodoId ?? null];

    // Inscripciones dentro del alcance del filtro
    const ins = `
      SELECT i.*
      FROM inscripciones i
      JOIN cursos   c ON c.id = i.curso_id
      JOIN periodos pe ON pe.id = c.periodo_id
      WHERE CASE WHEN $1::uuid IS NULL THEN pe.activo = true ELSE c.periodo_id = $1::uuid END`;

    // Población atendida = personas distintas con al menos una inscripción en el alcance
    const pob = `SELECT u.* FROM users u WHERE u.id IN (SELECT usuario_id FROM (${ins}) x)`;

    const limpio = (col: string) =>
      `COALESCE(NULLIF(INITCAP(LOWER(TRIM(${col}))), ''), 'Sin dato')`;

    const [resumen] = await this.dataSource.query(
      `SELECT
         COUNT(*)::int                                              AS inscripciones,
         COUNT(DISTINCT usuario_id)::int                            AS personas,
         COUNT(*) FILTER (WHERE estado = 'activa')::int             AS activas,
         COUNT(*) FILTER (WHERE estado = 'pendiente')::int          AS pendientes,
         COUNT(*) FILTER (WHERE estado = 'en_espera')::int          AS en_espera,
         COUNT(*) FILTER (WHERE estado = 'retirada')::int           AS retiradas
       FROM (${ins}) x`,
      p,
    );

    const dimensiones: { dim: string; etiqueta: string; total: number }[] =
      await this.dataSource.query(
        `WITH pob AS (${pob})
         SELECT 'genero' AS dim, ${limpio('genero')} AS etiqueta, COUNT(*)::int AS total FROM pob GROUP BY 2
         UNION ALL
         SELECT 'zona', ${limpio('zona_residencia')}, COUNT(*)::int FROM pob GROUP BY 2
         UNION ALL
         SELECT 'enfoque', ${limpio('enfoque_poblacional')}, COUNT(*)::int FROM pob GROUP BY 2
         UNION ALL
         SELECT 'barrio', ${limpio('barrio')}, COUNT(*)::int FROM pob GROUP BY 2
         UNION ALL
         SELECT 'estrato', COALESCE('Estrato ' || estrato::text, 'Sin dato'), COUNT(*)::int FROM pob GROUP BY 2
         UNION ALL
         SELECT 'discapacidad',
                CASE WHEN tiene_discapacidad IS TRUE THEN 'Con discapacidad'
                     WHEN tiene_discapacidad IS FALSE THEN 'Sin discapacidad'
                     ELSE 'Sin dato' END,
                COUNT(*)::int FROM pob GROUP BY 2
         UNION ALL
         SELECT 'ciclo',
                CASE
                  WHEN fecha_nacimiento IS NULL THEN 'Sin dato'
                  WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) <= 5  THEN '${CICLOS_VIDA[0]}'
                  WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) <= 11 THEN '${CICLOS_VIDA[1]}'
                  WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) <= 17 THEN '${CICLOS_VIDA[2]}'
                  WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) <= 28 THEN '${CICLOS_VIDA[3]}'
                  WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) <= 59 THEN '${CICLOS_VIDA[4]}'
                  ELSE '${CICLOS_VIDA[5]}'
                END,
                COUNT(*)::int FROM pob GROUP BY 2`,
        p,
      );

    const porMes: { mes: string; total: number; retiradas: number }[] = await this.dataSource.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', fecha_inscripcion), 'YYYY-MM') AS mes,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE estado = 'retirada')::int AS retiradas
       FROM (${ins}) x
       GROUP BY 1 ORDER BY 1`,
      p,
    );

    const porEstado: Conteo[] = await this.dataSource.query(
      `SELECT estado AS etiqueta, COUNT(*)::int AS total FROM (${ins}) x GROUP BY 1 ORDER BY 2 DESC`,
      p,
    );

    // Un curso puede pertenecer a varios programas: cuenta una vez por área
    const porArea: Conteo[] = await this.dataSource.query(
      `SELECT COALESCE(pr.area::text, 'Sin área') AS etiqueta,
              COUNT(DISTINCT x.id)::int AS total
       FROM (${ins}) x
       JOIN cursos c ON c.id = x.curso_id
       LEFT JOIN pensum pn ON pn.asignatura_id = c.asignatura_id
       LEFT JOIN programas_academicos pr ON pr.id = pn.programa_id
       GROUP BY 1 ORDER BY 2 DESC`,
      p,
    );

    const ocupacion: { curso: string; inscritos: number; capacidad: number; porcentaje: number }[] =
      await this.dataSource.query(
        `SELECT c.nombre AS curso,
                COUNT(i.id) FILTER (WHERE i.estado = 'activa')::int AS inscritos,
                c.capacidad_max::int AS capacidad,
                ROUND(100.0 * COUNT(i.id) FILTER (WHERE i.estado = 'activa') / NULLIF(c.capacidad_max, 0))::int AS porcentaje
         FROM cursos c
         JOIN periodos pe ON pe.id = c.periodo_id
         LEFT JOIN inscripciones i ON i.curso_id = c.id
         WHERE c.activo = true
           AND CASE WHEN $1::uuid IS NULL THEN pe.activo = true ELSE c.periodo_id = $1::uuid END
         GROUP BY c.id
         ORDER BY porcentaje DESC NULLS LAST, inscritos DESC`,
        p,
      );

    const dim = (d: string): Conteo[] =>
      dimensiones
        .filter(r => r.dim === d)
        .map(({ etiqueta, total }) => ({ etiqueta, total }))
        .sort((a, b) => b.total - a.total);

    const ordenar = (lista: Conteo[], orden: string[]) =>
      orden.map(etiqueta => lista.find(r => r.etiqueta === etiqueta) ?? { etiqueta, total: 0 })
        .filter(r => r.total > 0 || r.etiqueta !== 'Sin dato');

    const estratos = dim('estrato');
    const ordenEstratos = [...estratos.map(e => e.etiqueta).filter(e => e !== 'Sin dato').sort(), 'Sin dato'];

    return {
      resumen: {
        ...resumen,
        tasaRetiro: resumen.inscripciones
          ? +((100 * resumen.retiradas) / resumen.inscripciones).toFixed(1)
          : 0,
      },
      poblacion: {
        genero:       dim('genero'),
        cicloVida:    ordenar(dim('ciclo'), CICLOS_VIDA),
        estrato:      ordenar(estratos, ordenEstratos),
        zona:         dim('zona'),
        enfoque:      dim('enfoque'),
        discapacidad: dim('discapacidad'),
        barrios:      dim('barrio').filter(b => b.etiqueta !== 'Sin dato').slice(0, 10),
      },
      inscripciones: {
        porMes:    this.completarMeses(porMes),
        porEstado,
        porArea,
        ocupacion,
      },
    };
  }

  /** Rellena con 0 los meses sin inscripciones para que la serie temporal no salte. */
  private completarMeses(filas: { mes: string; total: number; retiradas: number }[]) {
    if (!filas.length) return [];
    const mapa = new Map(filas.map(f => [f.mes, f]));
    const [y0, m0] = filas[0].mes.split('-').map(Number);
    const [y1, m1] = filas[filas.length - 1].mes.split('-').map(Number);
    const salida: typeof filas = [];
    for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, (m = 1)) : m++) {
      const mes = `${y}-${String(m).padStart(2, '0')}`;
      salida.push(mapa.get(mes) ?? { mes, total: 0, retiradas: 0 });
    }
    return salida;
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