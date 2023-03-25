import { Command } from "commander";

// TODO : use a real logger system
// FIXME : move it somewhere else
export interface Logger {
  info(message: string): void;
  error(message: string): void;
  writeLn(message: string): void;
  newLine(): void;
  prompt(): void;
}

// TODO : move it somewhere else
// TODO : use something else to achieve the same thing
export type ConfigureCommand = (command: Command) => void;

export class XtermCommand extends Command {

  logger: Logger;

  constructor(logger: Logger) {
    super();

    this.logger = logger;
  }

  public setup() {

  }

}