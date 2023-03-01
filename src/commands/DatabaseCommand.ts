// import { frenchWordDatabase } from '../singletons/Singletons';// FIXME : use dependency injection instead ?

import { Command, Argument } from 'commander';
import { Logger, XtermCommand } from './XtermCommand';
import { FrenchWordDatabase } from '../domain/adapters/secondary/FrenchWordDatabase';

export class DatabaseCommand extends XtermCommand {

  // FIXME : replace by the interface IWordDatabase
  frenchWordDatabase: FrenchWordDatabase;

  constructor(frenchWordDatabase: FrenchWordDatabase, logger: Logger) {
    super(logger);

    this.frenchWordDatabase = frenchWordDatabase;
  }

  public setup(): void {
    this.name('database');
    this.addArgument(new Argument('<action>', 'action to be done').choices([/*'verify-wasm', */'verify-init', 'sequence-count']))
    this.action((action: string) => {
      console.log('action:', action);
      // TODO : clear status count fetch fetch no cache
      switch(action) {
        case 'verify-wasm':
          this.logger.info('Not implemented');
          break;
        case 'verify-init':
          if (this.frenchWordDatabase.wasInit === true) {
            this.logger.info('SQL was initialized');
          } else {
            this.logger.info('SQL was not initialized');
          }
          break;
        case 'sequence-count':
          const sequenceCount = this.frenchWordDatabase.sequencesCount;
          this.logger.info(`Sequences count is ${sequenceCount}`)
          break;
        default:
          throw new Error(`Action '${action}' is not known`);
      }
    });
  }

}

