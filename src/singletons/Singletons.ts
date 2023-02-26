import { WordGame } from "word-guessing-lib";
import { FrenchWordDatabase } from "../domain/adapters/secondary/FrenchWordDatabase";

// TODO : modify the deployment of the database
// const wordDatabaseRootURL: string = 'http://dev.onesime-deleham.ovh:3000/';
const wordDatabaseRootURL: string = 'https://dev.onesime-deleham.ovh/';
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
