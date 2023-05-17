import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

import { Command, OutputConfiguration } from 'commander';

// import { frenchWordDatabase, wordGame } from './singletons/Singletons';

import { DatabaseCommand, WordGameCommand, Logger, FrenchWordDatabase, WordDatabaseFactory, SupportedLangDatabases, WordGameCommander, DatabaseCommander } from 'word-guessing-game-common';
import { GuessResult, WordGame } from 'word-guessing-lib';
import { loadConfig } from './config/Config';
import { ConsoleAppender, IAppender, IConfiguration, ILayout, ILogEvent, Level, LogManager, LoggerFactory, PupaLayout } from 'log4j2-typescript';

// TODO : fix the blink cursor

// from https://github.com/xtermjs/xtermjs.org/blob/281b8e0f9ac58c5e78ff5b192563366c40787c4f/js/demo.js
// MIT license
var baseTheme = {
  foreground: '#F8F8F8',
  background: '#2D2E2C',
  selection: '#5DA5D533',
  black: '#1E1E1D',
  brightBlack: '#262625',
  red: '#CE5C5C',
  brightRed: '#FF7272',
  green: '#5BCC5B',
  brightGreen: '#72FF72',
  yellow: '#CCCC5B',
  brightYellow: '#FFFF72',
  blue: '#5D5DD3',
  brightBlue: '#7279FF',
  magenta: '#BC5ED1',
  brightMagenta: '#E572FF',
  cyan: '#5DA5D5',
  brightCyan: '#72F0FF',
  white: '#F8F8F8',
  brightWhite: '#FFFFFF',
};

const columnCount = 140;

var term = new Terminal({
  fontFamily: '"Cascadia Code", Menlo, monospace',
  theme: baseTheme,
  cursorBlink: true,
  allowProposedApi: true,
  cols: columnCount
});

const targetElementId = 'terminal';

// FIXME : is not working
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);

let targetElement = document.getElementById(targetElementId);
if (targetElement != null) {
  term.open(targetElement);
} else {
  throw new Error('The document does not contain an element of id ' + targetElementId);
}

fitAddon.fit();

const program = new Command();

program
  // Info : if you set it, you will need to pass it as a parameter
  // If you do not set it, it will appear in the help command anyway
  // There is something weird actually
  .name('run')
  .description('CLI to execute commands')
  .version('0.0.1');

function writeNewLine() {
  term.write('\r\n');
}

function writeLn(text: string) {
  // the new line character of commander is not the one supported by xterm
  term.writeln(text.replace(/\n/g, '\r\n'));
}

function writeOut(output: string) {
  writeNewLine();

  writeLn(output);

  prompt();
}

// FIXME : print in red
function writeErr(err: string | Error) {
  writeNewLine();

  console.error(err);

  if (err instanceof Error) {
    writeLn(err.message);
  } else {
    writeLn(err);
  }

  prompt();
}

// TODO : print warn

const configuration: OutputConfiguration = {
  writeOut: writeOut,
  writeErr: writeErr,
  getOutHelpWidth: () => {
    return columnCount;
  },
  getErrHelpWidth: () => {
    return columnCount;
  }
};

// TODO : use an option that make sure it is declared before it is used
var command = '';

function configureCommand(command: Command) {
  // command.showHelpAfterError();
  command.configureOutput(configuration);
  command.exitOverride(/*(err) => {
    console.log("attempting to exit");
  }*/);
}

function prompt() {
  // TODO : conditional \r\n, some errors have one at the end, it produce two carriage return
  command = '';
  term.write('\r\n$ ');
}

const logger: Logger = {
  info: writeOut,
  error: writeErr,
  writeLn: writeLn,
  newLine: writeNewLine,
  prompt: prompt,
}

// TODO : try to use this and type the logging system
interface TermLogData {
  doPrompt: boolean;
}


class TermAppender implements IAppender {

  name: string;
  layout: ILayout;

  constructor(name: string, layout: ILayout) {
    this.name = name;
    this.layout = layout;
  }

  handle(logEvent: ILogEvent): void {
    // Warn : we have to do this since we are using a single terminal in this project
    // The logger use an event system, it will be called after the prompt, creating unwanted results
    if (logEvent.message !== '') {
      logger.writeLn(this.layout.format(logEvent));
    }
    if (logEvent.object && logEvent.object.doPrompt) {
      console.log("doing prompt");
      logger.prompt();
    }
  }

}

const logConfiguration: IConfiguration = {
  appenders: [
    new ConsoleAppender("console", new PupaLayout("{loggerName} {level} {time} {message}")),
    new TermAppender("term", new PupaLayout("{message}"))
  ],
  loggers: [
    {
      name: "technical",
      level: Level.INFO,
      refs: [
        {
          ref: "console"
        }
      ]
    },
    {
      name: "term",
      level: Level.INFO,
      refs: [
        {
          ref: "term"
        }
      ]
    }
  ]
}

const logManager: LogManager = new LogManager(logConfiguration);

async function main() {

  let consoleLog = LoggerFactory.getLogger("technical");
  consoleLog.info("Starting", {});

  let termLog = LoggerFactory.getLogger("term"); 

  // TODO : insert ASCII art here
  termLog.info('\x1B[1;3;31mWordGuessr\x1B[0m\r\n');

  // TODO : mutualize this message with the multiplayer game
  termLog.info(`We are using two different databases for the dictionaries:
  - For the french language, we are using an extraction of Grammalecte's dictionary, which is released in MPL 2.0
  - For the english language, we are using an extraction of Wiktionary's dictionary, which is released under a dual license:
      - GNU Free Documentation License (GFDL)
      - Creative Commons Attribution-ShareAlike License
  `);

  const config = loadConfig();

  const supportedLangDatabases: SupportedLangDatabases = {
    english: {
      language: "eng",
      filename: config.english.filename,
    },
    french: {
      language: "fra",
      filename: config.french.filename,
    }
  };

  const databaseFactory = new WordDatabaseFactory(logger, config.rootUrl, supportedLangDatabases);

  // TODO : support english
  // probably need to add the VirtualInput too
  const englishDatabase = await databaseFactory.getEnglishWordDatabase();
  const frenchDatabase = await databaseFactory.getFrenchWordDatabase();

  const wordGame = new WordGame(frenchDatabase, englishDatabase, {
    minOccurences: 250,
    maxOccurences: 1000,
    guessAsSession: true,
    maxAttempts: 5,
    language: "fra"
  });

  termLog.info('Default language will be french, you can change it using the command "run wg lang english"');
  logger.prompt();

  const wordGameCommand = new WordGameCommander(wordGame, configureCommand, logger, frenchDatabase, englishDatabase);
  wordGameCommand.setup();
  configureCommand(wordGameCommand);
  program.addCommand(wordGameCommand);

  const databaseCommand = new DatabaseCommander(frenchDatabase,englishDatabase, configureCommand, logger);
  databaseCommand.setup();
  configureCommand(databaseCommand);
  program.addCommand(databaseCommand);

  configureCommand(program);

  // TODO : do not attempt to run the command if it is not the main one
  // TODO : add a help command
  // TODO : use a context system : if press wg, stay in the wg command
  function runCommand(text) {
    consoleLog.info("runCommand");

    // process (node), script (script.js), args
    // require to pass the name of the command if the name is passed to the program
    // program.name('name-of-the-app')
    const args = ['nothing', /*'nothing',*/ ...text.trim().split(' ')]

    try {
      // TODO : replace by a state machine or an input capture system
      // TODO : move the check somewhere else, it is also used in WordGameCommand
      if (wordGame.isGuessing) {
        const result = wordGame.verifyGuess(text);

        writeNewLine();

        switch (result) {
          case GuessResult.SUCCESSFUL_GUESS:
            termLog.info('Success !')
            break;
          case GuessResult.WORD_DO_NOT_EXIST:
            termLog.info('This word do not exist in the database.');
            break;
          case GuessResult.WORD_DO_NOT_MATCH_SEQUENCE:
            termLog.info(`This word do not match the current sequence ('${wordGame.currentSequence}').`);
            break;
          default:
            termLog.error('Internal error');
            consoleLog.error(`GuessResult '${result} is unknown`);
        }
        if (wordGame.remainingAttempts() === 0) {
          termLog.info('You have failed to find a word matching this sequence of letters.');
          termLog.info(`You could have tried : '${wordGame.getExampleForSequence()}'`);
          wordGame.reset();
        }
        termLog.info("", {doPrompt: true});
      } else {
        program.parse(args);
      }
    } catch (err) {
      consoleLog.info("an error occured:");
      consoleLog.warn(err);
    }
  }

  // TODO : test this
  // Modified version of this one https://github.com/xtermjs/xtermjs.org/blob/281b8e0f9ac58c5e78ff5b192563366c40787c4f/js/demo.js
  // MIT license
  term.onData((e) => {
    // TODO : use a special character enum provider
    switch (e) {
      case '\u001B':
        if (wordGame.isGuessing) {
          wordGame.reset();
          termLog.info('You are no longer playing.');
        }
        break;
      case '\u0003': // Ctrl+C
        if (wordGame.isGuessing) {
          wordGame.reset();
          termLog.info('You are no longer playing.');
        } else {
          term.write('^C');
          prompt();
        }
        break;
      case '\r': // Enter
        if (command.trim().length > 0) {
          runCommand(command);
          command = '';
        } else {
          prompt();
        }
        break;
      case '\u007F': // Backspace (DEL)
        // Do not delete the prompt

        // Info : those are not available in typescript
        //if (term.buf_core.buffer.x > 2) {
        //if (term.buffer.x > 2) {
        if (command.length > 0) {
          term.write('\b \b');
          if (command.length > 0) {
            command = command.substr(0, command.length - 1);
          }
        }
        break;
      default: // Print all other characters for demo
        if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7E) || e >= '\u00a0') {
          command += e;
          term.write(e);
        }
    }
  });

  if (targetElement != null) {
    // FIXME : illegal access is logged from here
    // In Firefox, A mutation operation was attempted on a database that did not allow mutations
    // Is also logged here, but should not be
    // There is also A mutation operation was attempted on a database that did not allow mutations.
    // (on the prompt)
    // TODO : verify if errors still occur
    const helpText = program.helpInformation();
    termLog.info(helpText);
    termLog.info("", {doPrompt: true})
  }
}

main();
