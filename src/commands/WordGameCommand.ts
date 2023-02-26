import { Argument, Command } from 'commander';
import { Logger, XtermCommand } from './XtermCommand';
import { frenchWordDatabase } from '../singletons/Singletons';
import { WordGame } from 'word-guessing-lib';

// TODO : use a real logger system
export type ConfigureCommand = (command: Command) => void;

export class WordGameCommand extends XtermCommand {

  wordGame: WordGame;
  configureCommand: ConfigureCommand;

  constructor(wordGame: WordGame, configureCommand: ConfigureCommand, logger: Logger) {
    super(logger);

    this.wordGame = wordGame;
    this.configureCommand = configureCommand;
  }

  public setup() {
    this.name('word-game');
    this.alias('wg');

    // TODO : the logic should not be dependent on commander

    this.command('new-sequence')
      .alias('new')
      .description('Generate a new sequence')
      .action(() => {
        this.logger.newLine();
        this.logger.writeLn('New sequence: ' + this.wordGame.getNewSequence());
        if (this.wordGame.wordGameOptions.maxAttempts > 0) {
          this.logger.writeLn(`You have ${this.wordGame.remainingAttempts()} attempts to find a word containing this sequence of letters.`);
        } else {
          this.logger.writeLn('You have unlimited attempts to find a word containing this sequence of letters.');
        }
        this.logger.prompt();
      })

    const exampleCommand = this.command('example');
    this.configureCommand(exampleCommand);// FIXME : this is called but not used
    exampleCommand
      .alias('ex')
      .description('Provide an example based on the current sequence')
      .action(() => {
        try {
          this.logger.info('Example: ' + this.wordGame.getExampleForSequence());
        } catch (error) {
          this.logger.error(error);
        }
      });

    const setMinOccurencesCommand = this.command('set-min-occurences');
    this.configureCommand(setMinOccurencesCommand);
    setMinOccurencesCommand
      .alias('set-min')
      .description('Set the minimum of occurences of the sequences searched. It will not search for sequence of letters with a number of word lesser than this value.')
      .argument('<min-occurences>', 'minimum of occurences')
      .action((minOccurences: number) => {
        this.wordGame.wordGameOptions.minOccurences = minOccurences;
        this.logger.info('Configuration modified');
      });

      const setMaxOccurencesCommand = this.command('set-max-occurences');
      this.configureCommand(setMaxOccurencesCommand);
      setMaxOccurencesCommand
        .alias('set-max')
        .description('Set the maximum of occurences of the sequences searched. It will not search for sequence of letters with a number of word superior to this value.')
        .argument('<max-occurences>', 'maximum of occurences')
        .action((maxOccurences: number) => {
          this.wordGame.wordGameOptions.maxOccurences = maxOccurences;
          this.logger.info('Configuration modified');
        });

        const printConfigurationCommand = this.command('print-configuration');
        this.configureCommand(printConfigurationCommand);
        printConfigurationCommand
          .aliases(['print-conf', 'conf'])
          .description('Display the configuration of the game.')
          .action(() => {
            this.logger.newLine()
            this.logger.writeLn('Configuration:');
            this.logger.writeLn(JSON.stringify(this.wordGame.wordGameOptions));
            this.logger.prompt();
          });

        const setMaxAttemptsCommand = this.command('set-max-attempts');
        this.configureCommand(setMaxAttemptsCommand);
        setMaxAttemptsCommand
          .aliases(['attempts'])
          .description('Set the maximum number of attempts to find a word containing the sequence of letters.')
          .argument('<max-attempts>', 'maximum of number of attempts')
          .action((maxAttempts: number) => {
            this.wordGame.wordGameOptions.maxAttempts = maxAttempts;
            this.logger.info('Configuration modified');
          });
  }

}
