// import { frenchWordDatabase } from '../singletons/Singletons';// FIXME : use dependency injection instead ?

import { Command, Argument } from 'commander';
import { ConfigureCommand, Logger, XtermCommand } from './XtermCommand';
import { FrenchWordDatabase } from '../domain/adapters/secondary/FrenchWordDatabase';

export class DatabaseCommand extends XtermCommand {

  // FIXME : replace by the interface IWordDatabase
  frenchWordDatabase: FrenchWordDatabase;
  configureCommand: ConfigureCommand;

  constructor(frenchWordDatabase: FrenchWordDatabase,  configureCommand: ConfigureCommand, logger: Logger) {
    super(logger);

    this.frenchWordDatabase = frenchWordDatabase;

    this.configureCommand = configureCommand;
  }

  public setup(): void {
    this.name('database');
    this.alias('db');

    const wasmCommand = this.command('wasm');
    this.configureCommand(wasmCommand);
    wasmCommand
      // .alias('wasm')
      .description('Indicate the status of the loading of the WASM')
      .action(() => {
        this.logger.info('Not implemented');
      });

    const statusCommand = this.command('status');
    this.configureCommand(statusCommand);
    statusCommand
      // .alias('status')
      .description('Indicate the status of database')
      .action(() => {
        // TODO : this should be computed
        // TODO : check multiple status (WASM etc)
        if (this.frenchWordDatabase.wasInit === true) {
          this.logger.info('The database was initialized');
        } else {
          this.logger.info('The database was not initialized');
        }
      });

    const countCommand = this.command('count');
    this.configureCommand(countCommand);
    countCommand
      // .alias('status')
      .description('Indicate word and sequence of letters count')
      .action(() => {
        this.logger.newLine();
        const wordCount = this.frenchWordDatabase.countWords();
        const sequenceCount = this.frenchWordDatabase.countSequences();
        this.logger.writeLn(`Word count is ${wordCount}`);
        this.logger.writeLn(`Sequences count is ${sequenceCount}`);
        this.logger.prompt();
      });

    const dropCommand = this.command('drop');
    this.configureCommand(dropCommand);
    dropCommand
      // .alias('status')
      .description('Drop the database')
      .action(async () => {
        this.logger.newLine();
        this.logger.writeLn(`Dropping the database`);
        await this.frenchWordDatabase.delete();
        this.logger.writeLn(`Database was dropped`);
        this.logger.prompt();
      });

    // TODO : init (using a factory)
  }

}

