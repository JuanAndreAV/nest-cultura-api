import { Command, CommandRunner } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { MigrationService } from './migration.service';

@Injectable()
@Command({
  name: 'migrar:q10',
  description: 'Migra y sincroniza estudiantes desde Q10 a Supabase',
})
export class MigrationCommand extends CommandRunner {
  constructor(private readonly migrationService: MigrationService) {
    super();
  }

  async run(): Promise<void> {
    this.migrationService.logger.log('Iniciando migración Q10...');

    const resultados = await this.migrationService.sincronizarEstudiantes();

    this.migrationService.logger.log('════════════════════════════════');
    this.migrationService.logger.log('MIGRACIÓN COMPLETADA');
    this.migrationService.logger.log(`Total     : ${resultados.total}`);
    this.migrationService.logger.log(`✓ Creados : ${resultados.creados}`);
    this.migrationService.logger.log(`↺ Actualizados : ${resultados.actualizados}`);
    this.migrationService.logger.log(`✗ Errores : ${resultados.errores}`);
    if (resultados.detalle_errores.length) {
      resultados.detalle_errores.forEach(e =>
        this.migrationService.logger.warn(`  ${e}`),
      );
    }
    this.migrationService.logger.log('════════════════════════════════');
  }
}