import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

import { Command, OutputConfiguration } from 'commander';

// import { frenchWordDatabase, wordGame } from './singletons/Singletons';

import { DatabaseCommand, WordGameCommand, Logger, FrenchWordDatabase } from 'word-guessing-game-common';
import { GuessResult, WordGame } from 'word-guessing-lib';

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

async function main() {
  const wordDatabaseRootURL: string = 'https://dev.onesime-deleham.ovh/';
  const wordDatabaseFilename: string = 'sample.db';
  const frenchWordDatabase = new FrenchWordDatabase(wordDatabaseRootURL, wordDatabaseFilename, logger);
  // TODO : add a log here for Dexie
  await frenchWordDatabase.open();
  await frenchWordDatabase.initSQL();

  const wordGame = new WordGame(frenchWordDatabase, {
    minOccurences: 250,
    maxOccurences: 1000,
    guessAsSession: true,
    maxAttempts: 5,
  });

  const wordGameCommand = new WordGameCommand(wordGame, configureCommand, logger);
  wordGameCommand.setup();
  configureCommand(wordGameCommand);
  program.addCommand(wordGameCommand);

  const databaseCommand = new DatabaseCommand(frenchWordDatabase, configureCommand, logger);
  databaseCommand.setup();
  configureCommand(databaseCommand);
  program.addCommand(databaseCommand);

  configureCommand(program);

  // TODO : do not attempt to run the command if it is not the main one
  // TODO : add a help command
  // TODO : use a context system : if press wg, stay in the wg command
  function runCommand(text) {
    console.log("runCommand");

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
            writeLn('Success !')
            break;
          case GuessResult.WORD_DO_NOT_EXIST:
            writeLn('This word do not exist in the database.');
            break;
          case GuessResult.WORD_DO_NOT_MATCH_SEQUENCE:
            writeLn(`This word do not match the current sequence ('${wordGame.currentSequence}').`);
            break;
          default:
            writeErr('Internal error');
            console.error(`GuessResult '${result} is unknown`);
        }
        if (wordGame.remainingAttempts() === 0) {
          writeLn('You have failed to find a word matching this sequence of letters.');
          writeLn(`You could have tried : '${wordGame.getExampleForSequence()}'`);
          wordGame.reset();
          prompt();
        } else {
          prompt();
        }
      } else {
        program.parse(args);
      }
    } catch (err) {
      console.log("an error occured:");
      console.warn(err);
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
          writeOut('You are no longer playing.');
        }
        break;
      case '\u0003': // Ctrl+C
        if (wordGame.isGuessing) {
          wordGame.reset();
          writeOut('You are no longer playing.');
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
    // TODO : insert ASCII art here
    term.write('\x1B[1;3;31mWordGuessr\x1B[0m ');

    // FIXME : illegal access is logged from here
    // In Firefox, A mutation operation was attempted on a database that did not allow mutations
    // Is also logged here, but should not be
    // There is also A mutation operation was attempted on a database that did not allow mutations.
    // (on the prompt)
    // TODO : verify if errors still occur
    const helpText = program.helpInformation();
    writeLn(helpText);
    prompt();

  }
}

main();
