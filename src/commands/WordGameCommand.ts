import { Argument, Command } from 'commander';
import { ConfigureCommand, Logger, XtermCommand } from './XtermCommand';
import { WordGame, GuessResult } from 'word-guessing-lib';

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

    // TODO : command with a sequence as a parameter assign, new with option ?
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
      });

    const exampleCommand = this.command('example');
    this.configureCommand(exampleCommand);// FIXME : this is called but not used
    exampleCommand
      .alias('ex')
      .description('Provide an example based on the current sequence')
      .argument('[sequence]', 'the sequence to use')
      .action((sequence: string) => {
        if (sequence != undefined) {
          this.wordGame.currentSequence = sequence;
        }
        try {
          this.logger.info('Example: ' + this.wordGame.getExampleForSequence());
        } catch (error) {
          this.logger.error(error);
        }
      });

    this.command('verify')
      .description('Verify a word and a sequence')
      .argument('<sequence>', 'the sequence to use')
      .argument('<word>', 'the word to verify')
      .action((sequence: string, word: string) => {
        this.logger.newLine();
        const actualSequence = sequence.toUpperCase();
        this.logger.writeLn('Verifying ' + word + ' against ' + actualSequence);
        this.wordGame.currentSequence = actualSequence;
        const result = this.wordGame.verifyGuess(word);
        switch (result) {
          case GuessResult.SUCCESSFUL_GUESS:
            this.logger.writeLn('Success !')
            break;
          case GuessResult.WORD_DO_NOT_EXIST:
            this.logger.writeLn('This word do not exist in the database.');
            break;
          case GuessResult.WORD_DO_NOT_MATCH_SEQUENCE:
            this.logger.writeLn(`This word do not match the current sequence ('${this.wordGame.currentSequence}').`);
            break;
          default:
            this.logger.writeLn('Internal error');
            console.error(`GuessResult '${result} is unknown`);
        }
        this.wordGame.reset();
        this.logger.prompt();
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
