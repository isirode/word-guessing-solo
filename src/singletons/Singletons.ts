import { WordGame } from "word-guessing-lib";
import { FrenchWordDatabase } from "../domain/adapters/secondary/FrenchWordDatabase";

// TODO : test this
const wordDatabaseRootURL: string = 'http://dev.onesime-deleham.ovh:3000/';
const wordDatabaseFilename: string = 'sample.db';
const frenchWordDatabase = new FrenchWordDatabase(wordDatabaseRootURL, wordDatabaseFilename);
frenchWordDatabase.open();
frenchWordDatabase.initSQL();

const wordGame = new WordGame(frenchWordDatabase, {
  minOccurences: 0,
  maxOccurences: 10,
  guessAsSession: true,
  maxAttempts: 5,
});

export { frenchWordDatabase, wordGame };
