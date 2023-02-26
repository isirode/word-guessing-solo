import { Command } from "commander";

// TODO : use a real logger system
export interface Logger {
  info(message: string): void;
  error(message: string): void;
  writeLn(message: string): void;
  newLine(): void;
  prompt(): void;
}

export class XtermCommand extends Command {

  logger: Logger;

  constructor(logger: Logger) {
    super();

    this.logger = logger;
  }

  public setup() {

  }

}