## Table `asignaturas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `programa_id` | `uuid` |  |
| `docente_id` | `uuid` |  Nullable |
| `nombre` | `text` |  |
| `descripcion` | `text` |  Nullable |
| `activo` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `asistencias`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `inscripcion_id` | `uuid` |  |
| `fecha` | `date` |  |
| `asistio` | `bool` |  |
| `observacion` | `text` |  Nullable |
| `registrado_por` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `aulas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `text` |  Unique |
| `capacidad` | `int4` |  Nullable |
| `descripcion` | `text` |  Nullable |
| `activo` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `cursos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `asignatura_id` | `uuid` |  |
| `periodo_id` | `uuid` |  |
| `docente_id` | `uuid` |  Nullable |
| `nombre` | `text` |  |
| `descripcion` | `text` |  Nullable |
| `capacidad_max` | `int4` |  |
| `edad_min` | `int4` |  Nullable |
| `edad_max` | `int4` |  Nullable |
| `intensidad_horaria` | `numeric` |  Nullable |
| `porcentaje_asistencia_min` | `numeric` |  Nullable |
| `nota_aprobatoria` | `numeric` |  Nullable |
| `requiere_nivel_previo` | `bool` |  Nullable |
| `curso_prerequisito_id` | `uuid` |  Nullable |
| `activo` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `horarios`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `curso_id` | `uuid` |  |
| `aula_id` | `uuid` |  Nullable |
| `dia_semana` | `text` |  |
| `hora_inicio` | `time` |  |
| `hora_fin` | `time` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `inscripciones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `usuario_id` | `uuid` |  |
| `curso_id` | `uuid` |  |
| `fecha_inscripcion` | `date` |  Nullable |
| `estado` | `text` |  |
| `observaciones` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `notas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `inscripcion_id` | `uuid` |  |
| `tipo_evaluacion` | `text` |  |
| `descripcion` | `text` |  Nullable |
| `valor` | `numeric` |  |
| `valor_max` | `numeric` |  |
| `periodo_evaluativo` | `text` |  Nullable |
| `fecha` | `date` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `periodos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `programa_id` | `uuid` |  |
| `nombre` | `text` |  |
| `fecha_inicio` | `date` |  |
| `fecha_fin` | `date` |  |
| `activo` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `programas_academicos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `text` |  Unique |
| `descripcion` | `text` |  Nullable |
| `color_hex` | `text` |  Nullable |
| `activo` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `varchar` |  Unique |
| `nombre` | `varchar` |  Nullable |
| `role` | `users_role_enum` |  |
| `createdAt` | `timestamp` |  |
| `apellido` | `varchar` |  Nullable |
| `documento` | `varchar` |  Nullable Unique |
| `fecha_nacimiento` | `date` |  Nullable |
| `telefono` | `varchar` |  Nullable |
| `activo` | `bool` |  |
| `foto_url` | `varchar` |  Nullable |
| `updatedAt` | `timestamp` |  |

## Table `usuario_roles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `usuario_id` | `uuid` | Primary |
| `rol` | `users_role_enum` | Primary |
| `asignado_en` | `timestamptz` |  Nullable |

