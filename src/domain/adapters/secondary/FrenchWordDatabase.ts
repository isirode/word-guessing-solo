import type { IWordDatabase } from 'word-guessing-lib'
import Dexie from 'dexie'
import { FetchProgress, SimpleProgressCallback } from '../../../utils/FetchProgress'
import { Logger } from '../../../commands/XtermCommand'
// TODO : it is not easily usable, find a solution when we have time for this
// We cannot use the code as is
// This is not possible for instance
// const sequence = stmt.getAsObject()
// result = sequence.sequence
// And the type code, not maintained by the provider of the lib, does not indicate how to use it
// import initSqlJs, { Database } from 'sql.js'

const initSqlJs = require('sql.js')

interface IFile {
  id?: number,
  filename: string,
  blob: any
}

export class FrenchWordDatabase extends Dexie implements IWordDatabase {
  // words: Dexie.Table<IWord, number>
  // sequences: Dexie.Table<ISequence, number>
  files: Dexie.Table<IFile, number>
  sqlDB: any
  // sqlDB: Database
  sequencesCount: number = -1
  wordDatabaseRootURL: string
  wordDatabaseFilename: string
  wasInit: boolean = false

  logger: Logger;

  protected get wordDatabaseFullPath () {
    return this.wordDatabaseRootURL + this.wordDatabaseFilename
  }

  constructor (wordDatabaseRootURL: string, wordDatabaseFilename: string, logger: Logger) {
    super('FrenchWordDatabase')

    this.wordDatabaseRootURL = wordDatabaseRootURL;
    this.wordDatabaseFilename = wordDatabaseFilename;

    this.logger = logger;

    this.version(1).stores({
      /* words: 'id, nomPropre, Verbe', 'id, nom, adjectif, prenom, patronyme, nomPropre, titre, Verbe, Adverbe, AdverbeDeNegation, AdverbeInterrogatif,' +
        // locutions
        ' LocutionAdverbiale, LocutionAdjectivale, LocutionVerbale, LocutionNominale, LocutionPatronymique, LocutionInterjective, ' +
        'LocutionPrepositive, LocutionPrepositiveVerbale, LocutionConjonctive, LocutionConjonctiveDeSubordination, Interjection, MotGrammatical' +
        // Determinants
        'Determinant, DeterminantDemonstratif, DeterminantExclamatif, DeterminantIndefini, DeterminantNegatif, DeterminantPossessif, ' +
        // Preposition
        'Preposition, PrepositionVerbale, ' +
        // Nombre
        'Nombre, NombreLatin, ' +
        // Conjonction
        'Conjonction, ConjonctionDeCoordination, ConjonctionDeSubordination, ' +
        // Prefixe verbale
        'PrefixeVerbal, ' +
        // Pronom
        'Pronom, PronomAdverbial, PronomDemonstratif, PronomIndefini, PronomIndefiniNegatif, PronomInterrogatif, PronomPersonnelComplementDObjet, PronomPersonnelSujet, PronomRelatif',
      sequences: 'id, sequence, occurences', */
      files: 'id++, filename'
    })

    // this.words = this.table("words")
    // this.sequences = this.table("sequences")
    this.files = this.table('files')
  }

  initSQL = async () => {
    console.log('Querying sql.js WASM file');

    /*
    const SQL = await initSqlJs({
      locateFile: (file: any) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.1/${file}`// `./node_modules/sql.js/dist/${file}`// `https://sql.js.org/dist/${file}`// `/node_modules/sql.js/dist/${file}`
    })
    */
    const SQL = await initSqlJs({
      // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
      // You can omit locateFile completely when running in node
      locateFile: file => `https://sql.js.org/dist/${file}`
    });

    // TODO : fix duplication
    console.log('Initializing word database');
    this.logger.writeLn('Initializing word database');

    let uint8Array: Uint8Array | null = null;
    const count = await this.files.count()
    if (count !== 0) {
      this.logger.writeLn('Word database present in local storage, fetching it');
      console.log('Word database present in local storage, fetching it');
      const file = await this.files.where('filename').equalsIgnoreCase(this.wordDatabaseFilename).first();
      uint8Array = file?.blob;
    } else {
      this.logger.writeLn('Word database not present locally, fetching it from the server');
      console.log('Word database (SQLite) not present locally, fetching it from the server');
      
      try {
        // TODO : use multiple provider XMLHttpRequest, Axios etc

        // TODO : make a class for this (the SimpleProgressCallback)
        this.logger.newLine();
        this.logger.writeLn('Progress: ');
        let lastProgressPerCent: number = 0;
        const progressCallback: SimpleProgressCallback = {
          callback: (contentLength: number | null, currentProgress: number, lastChunkLength: number) => {
            if (contentLength === null) {
              return;
            }
            const progressInPerCent = currentProgress / contentLength * 100;
            if (progressInPerCent >= lastProgressPerCent + 10) {
              this.logger.writeLn(progressInPerCent.toFixed() + ' %');
              lastProgressPerCent += 10;
            }
          }
        }
        const fetchProgress: FetchProgress = new FetchProgress(progressCallback);
        uint8Array = await fetchProgress.doFetch(this.wordDatabaseFullPath);

        this.logger.writeLn('Done !');
        this.logger.newLine();
        console.log("Done");

      } catch (err: any) {
        console.log('Unexpected error occured while fetching SQLite word database from the server', err)
        throw err
      }

      if (uint8Array === null) {
        this.logger.error('Error: Database is empty');
        throw new Error("Database file array is null");
      }
      if (uint8Array.length === 0) {
        this.logger.error('Error: Database is empty');
        throw new Error("Database file array is empty");
      }

      const t0 = performance.now();
      this.files.add({
        filename: 'sample.db',
        blob: uint8Array
      }).then(function (lastKey) {
        const t1 = performance.now();
        console.log('File was inserted (key: ' + lastKey + '), it took ' + (t1 - t0) / 1000 + ' seconds');
      }).catch(Dexie.BulkError, function (e) {
        console.error('An unexpected error occurred while inserting file, error count : ' + e.failures.length);
        console.error(e);
      });
    }

    // const [SQL, buf] = await Promise.all([sqlPromise, dataPromise])

    this.logger.writeLn('Loading word database in memory');
    console.log('initializing sqlite database')

    this.sqlDB = new SQL.Database(uint8Array)

    const sequenceCount = this.countSequences();

    if (sequenceCount === undefined) {
      // TODO : it is probably better to catch the errors and log them elsewhere
      // TODO : uniformize the formats of errors
      this.logger.error('Error: No sequences are present in the database');
      throw new Error('No sequences were present in the database')
    } else {
      this.sequencesCount = sequenceCount;
    }

    const wordCount = this.countWords();

    if (wordCount === undefined) {
      // TODO : it is probably better to catch the errors and log them elsewhere
      // TODO : uniformize the formats of errors
      this.logger.error('Error: No words are present in the database');
      throw new Error('No sequences were present in the database')
    } else {
      this.sequencesCount = sequenceCount;
    }

    this.logger.writeLn('Word count: ' + wordCount);
    this.logger.writeLn('Sequence count: ' + sequenceCount);

    // FIXME : it should be ensured elsewhere that the prompt is displayed
    this.logger.prompt();

    // TODO : move it to an extension
    // TODO : create a collate ?
    function compareInsensitive (word1: string, word2: string) {
      return word1.localeCompare(word2, 'fr', { sensitivity: 'base' }) === 0
    }
    this.sqlDB.create_function('compareInsensitive', compareInsensitive)

    // TODO : make a lib for all this
    // TODO : this does not work with accents
    // Checkout instr maybe
    function containsInsensitive (word1: string, word2: string) {
      return word1.search(new RegExp(word2, 'i')) !== -1
    }
    this.sqlDB.create_function('containsInsensitive', containsInsensitive)

    this.wasInit = true;
  }

  // FIXME : should it throw an exception instead ?
  public countSequences(): number | undefined {
    const stmt = this.sqlDB.prepare('SELECT count(*) as c FROM sequences');
    while (stmt.step()) {
      const count = stmt.getAsObject()
      return count.c;
    }
    return undefined;
  }

  // FIXME : should it throw an exception instead ?
  public countWords(): number | undefined {
    const stmt = this.sqlDB.prepare('SELECT count(*) as c FROM words');
    while (stmt.step()) {
      const count = stmt.getAsObject()
      return count.c;
    }
    return undefined;
  }

  public getSequence (minOccurences: number, maxOccurences: number): string {
    /*
    const id = Math.floor(Math.random() * this.sequencesCount) + 0
    const stmt = this.sqlDB.prepare("SELECT * FROM sequences WHERE id=:id LIMIT 1")
    stmt.bind({
      ':id': id
    })
    */
    const stmt = this.sqlDB.prepare('SELECT * FROM sequences WHERE occurences BETWEEN :minOccurences AND :maxOccurences ORDER BY RANDOM() LIMIT 1')
    stmt.bind({
      ':minOccurences': minOccurences,
      ':maxOccurences': maxOccurences
    })
    let result: string = ''
    while (stmt.step()) {
      const sequence = stmt.getAsObject()
      result = sequence.sequence
    }
    // free the memory used by the statement
    stmt.free()
    return result// .toLowerCase()
  }

  // TODO : check words and sequence like GAIE et égaie
  public wordExists (word: string): boolean {
    console.log('verifying if word exist (' + word + ')')
    // We dont use compare insensitive because it is too slow
    // const stmt = this.sqlDB.prepare("SELECT * FROM words WHERE compareInsensitive(word, :word) LIMIT 1")// COLLATE NOCASE

    const normalizedWord = word.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    console.log("normalized : " + normalizedWord);
    const stmt = this.sqlDB.prepare('SELECT * FROM words WHERE normalized_word = :word LIMIT 1')// COLLATE NOCASE
    stmt.bind({
      ':word': normalizedWord
    })
    let result: string = ''
    while (stmt.step()) {
      const word = stmt.getAsObject()
      result = word.word
    }
    // free the memory used by the statement
    stmt.free()
    return result.length > 0
  }

  public getWord (sequence: string): string {
    const stmt = this.sqlDB.prepare('SELECT * FROM words WHERE containsInsensitive(normalized_word, :sequence) LIMIT 1')// COLLATE NOCASE
    stmt.bind({
      ':sequence': sequence
    })
    let result: string = ''
    while (stmt.step()) {
      const word = stmt.getAsObject()
      result = word.word
    }
    // free the memory used by the statement
    stmt.free()
    return result
  }
}
