import type { IWordDatabase } from 'word-guessing-lib'
import Dexie from 'dexie'

const initSqlJs = require('sql.js')

interface IFile {
  id?: number,
  filename: string,
  blob: any
}

// const wordFilename = 'sample.db'
// const sambleDbURL = 'http://dev.onesime-deleham.ovh:3000/' + wordFilename

export class FrenchWordDatabase extends Dexie implements IWordDatabase {
  // words: Dexie.Table<IWord, number>
  // sequences: Dexie.Table<ISequence, number>
  files: Dexie.Table<IFile, number>
  sqlDB: any
  sequencesCount: number = -1
  wordDatabaseRootURL: string
  wordDatabaseFilename: string
  wasInit: boolean = false

  protected get wordDatabaseFullPath () {
    return this.wordDatabaseRootURL + this.wordDatabaseFilename
  }

  constructor (wordDatabaseRootURL: string, wordDatabaseFilename: string) {
    super('FrenchWordDatabase')

    this.wordDatabaseRootURL = wordDatabaseRootURL
    this.wordDatabaseFilename = wordDatabaseFilename

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
    console.log('querying sql.js file')

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

    console.log('querying sample.db file')

    let uint8Array: Uint8Array
    const count = await this.files.count()
    if (count !== 0) {
      console.log('Sequences table already initiazed, not querying sqlite db')
      const file = await this.files.where('filename').equalsIgnoreCase(this.wordDatabaseFilename).first()
      uint8Array = file?.blob
    } else {
      console.log('SQLite file not present, fetching it from the server')
      let buf: ArrayBuffer
      try {
        buf = await fetch(this.wordDatabaseFullPath).then(res => res.arrayBuffer())
      } catch (err: any) {
        console.log('Unexpected error occured while fetching SQLite database from the server', err)
        throw err
      }
      uint8Array = new Uint8Array(buf)

      const t0 = performance.now()
      this.files.add({
        filename: 'sample.db',
        blob: uint8Array
      }).then(function (lastKey) {
        const t1 = performance.now()
        console.log('Successfully added file, last key is : ' + lastKey + ', in ' + (t1 - t0) / 1000 + ' seconds')
      }).catch(Dexie.BulkError, function (e) {
        console.error('Error while inserting file, error count : ' + e.failures.length)
        console.error(e)
      })
    }

    // const [SQL, buf] = await Promise.all([sqlPromise, dataPromise])

    console.log('initializing sqlite database')

    this.sqlDB = new SQL.Database(uint8Array)

    const sequenceCount = this.countSequences();

    if (sequenceCount === undefined) {
      throw new Error('No sequences were present in the database')
    } else {
      this.sequencesCount = sequenceCount;
    }

    // TODO : move it to an extension
    // TODO : create a collate ?
    function compareInsensitive (word1: string, word2: string) {
      return word1.localeCompare(word2, 'fr', { sensitivity: 'base' }) === 0
    }
    this.sqlDB.create_function('compareInsensitive', compareInsensitive)

    function containsInsensitive (word1: string, word2: string) {
      return word1.search(new RegExp(word2, 'i')) !== -1
    }
    this.sqlDB.create_function('containsInsensitive', containsInsensitive)

    this.wasInit = true;
  }

  // FIXME : should it throw an exception instead ?
  public countSequences(): number | undefined {
    const stmt = this.sqlDB.prepare('SELECT count(*) as c FROM sequences')
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

  public wordExists (word: string): boolean {
    console.log('verifying if word exist')
    // We dont use compare insensitive because it is too slow
    // const stmt = this.sqlDB.prepare("SELECT * FROM words WHERE compareInsensitive(word, :word) LIMIT 1")// COLLATE NOCASE
    // const normalizedWord = word.normalize("NFD")// .replace(/\p{Diacritic}/gu, "")
    // console.log("normalized : " + normalizedWord)
    const stmt = this.sqlDB.prepare('SELECT * FROM words WHERE normalized_word = :word LIMIT 1')// COLLATE NOCASE
    stmt.bind({
      ':word': word
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
    const stmt = this.sqlDB.prepare('SELECT * FROM words WHERE containsInsensitive(word, :sequence) LIMIT 1')// COLLATE NOCASE
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
