import Hypher from 'hypher';
import english from 'hyphenation.en-us';
import validUrl from 'valid-url';
import pluralize from 'pluralize';

import config from '../config';
import logger from './logger';
import stopwords from './stopwords';
import wordsDb from './handlers/Words';
import { WordType } from './handlers/Words';

const h = new Hypher(english);

/**
 * Separate string in preparation for butiffication
 *
 * @param  {string} string String input
 * @return {array} Ready to buttify
 */
const prepareForButtification = (string: string): string[] => {
  const trimmed = string.trim();
  const split = trimmed.split(' ');

  return split;
};

/**
 * Rejoin string after done buttifying
 *
 * @param  {Array} split Array of updated string
 * @return {string}
 */
function finishButtification(split: string[]): string {
  return split.join(' ');
}

/**
 * Capitalize the first letter of a word
 *
 * @param  {string} string Word to capitalize
 * @return {string}
 */
function capitalizeFirstLetter(string: string): string {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
}

/**
 * Determine if word should be butted
 *
 * @param  {string} string  Stripped version of the word
 * @return {boolean}
 */
export const shouldWeButt = (string: string): boolean => {
  // Does the word contain or is the meme?
  if (
    string.toLowerCase().includes(config.meme) ||
    pluralize.singular(string.toLowerCase()).includes(config.meme)
  ) {
    logger.debug('Skipping buttification. Word contains configured meme');
    return false;
  }

  // Is the word a stop word?
  let stopWordExists = false;
  stopwords.forEach((word): void => {
    if (string.toLowerCase() === word.toLowerCase()) {
      stopWordExists = true;
    }
  });

  if (stopWordExists) {
    //console.log("stop word", string);
    return false;
  }

  // Is the word a URL?
  if (validUrl.isUri(string)) {
    return false;
  }

  return true;
};

/**
 * Did we actually change the string at all?
 *
 * @param  {string} original  Original version of the string
 * @param  {string} newString Possibly buttified version of the string
 * @return {boolean}
 */
const didWeActuallyButt = (original: string, newString: string): boolean => {
  if (original === newString) {
    return false;
  }

  return true;
};

const subButt = (word: string): string => {
  //console.log("subButt", word);
  const ogWord = word;
  let buttWord = config.meme;

  const punc = word.match(/^([^A-Za-z]*)(.*?)([^A-Za-z]*)$/);

  const pS = punc[1];
  const sWord = punc[2];
  const pE = punc[3];

  if (!shouldWeButt(sWord)) {
    return ogWord;
  }

  const hyphenated = h.hyphenate(sWord);

  if (sWord === sWord.toUpperCase()) {
    buttWord = buttWord.toUpperCase();
  }

  if (hyphenated.length > 1) {
    const swapIndex = Math.floor(Math.random() * hyphenated.length);

    if (swapIndex === 0 && sWord.match(/^[A-Z]/)) {
      buttWord = capitalizeFirstLetter(buttWord);
    }
    hyphenated[swapIndex] = buttWord;

    buttWord = hyphenated.join('');
  } else if (sWord.match(/^[A-Z]/)) {
    buttWord = capitalizeFirstLetter(buttWord);
  }

  if (pluralize.isPlural(sWord)) {
    buttWord = pluralize.plural(buttWord);
  }

  return pS + buttWord + pE;
};

const buttify = async (
  string: string): Promise<{
    result: string;
    words: { word: string; buttified: string }[];
  }> => {
  const originalString = string;
  const fullButtdex: number[] = [];
  const buttdex: number[] = [];
  const buttifiedWords: { word: string; buttified: string }[] = [];
  let err = null;

  // Separate the string into an array
  const split = prepareForButtification(string);
  console.log("split", split);
  const legalSplit = split.filter(word => stopwords.indexOf(word) < 0);
  console.log("legalSplit", legalSplit);
  const randomIndexes = [];
  for (let i = 0; i < split.length; i++) {
    const word = split[i];
    if (stopwords.indexOf(word) < 0) {
      randomIndexes.push(i);
    }
  }

  console.log("randomIndexes", randomIndexes);

  if (split.length < config.minimumWordsBeforeButtification) {
    err = 'Not enough words to buttify';
    throw new Error(err);
  }

  if (randomIndexes.length < 1) {
    err = 'Not enough non-ignored words to buttify';
    throw new Error(err);
  }

  // ButtAI Version 1.0
  //
  // Choose words to buttify. Super simple here. Just chance to select random
  // words from the string. Eventually we want to weight them and pick them
  // that way but for now this will work.
  //
  // If word has saved mapping, use it instead of random replacement in word.
  //
  // As of now we use wordsToPossiblyButt as a factor for buttification chance.
  // If a sentance has 9 words it will be divided by the chance to possibly butt
  // and has 3 chances to have butts in it. This means sentances shorter
  // than the chance to butt will never be buttified.
  //
  // We also check to make sure this index hasn't been buttified already!
  const replacementLimit = Math.floor(Math.random() * Math.floor(split.length / config.wordsToPossiblyButt)) + 1;
  for (let x = 0; x < replacementLimit; x += 1) {
    logger.debug(`Attempting buttification #${x + 1} out of ${replacementLimit}`);

    const rndIndex = randomIndexes[Math.floor(Math.random() * randomIndexes.length)];

    if (!buttdex.includes(rndIndex)) {
      const word = split[rndIndex];
      console.log("choose word", word, "at", rndIndex);

      const mappedWord = await wordsDb.getWordIfExists(word);
      if (mappedWord) {
        logger.debug("Use saved mapping " + mappedWord.buttified);
        split[rndIndex] = mappedWord.buttified;
      } else {
        split[rndIndex] = subButt(word);
      }

      buttdex.push(rndIndex);
      // if current replacement replaced entire word, skip adjacent words
      if (split[rndIndex].toLowerCase() == config.meme.toLowerCase()){
        buttdex.push(rndIndex - 1);
        buttdex.push(rndIndex + 1);
      }

      if (split[rndIndex] !== word) {
        buttifiedWords.push({
          word,
          buttified: split[rndIndex],
        });
      }
    } else {
      logger.debug("Picked index that is not allowed " + rndIndex);
    }
  }

  // Make sure it doesnt match original input string. We had to have
  // buttified at least one thing.
  const final = finishButtification(split);

  if (!didWeActuallyButt(originalString, final)) {
    err = "We didn't buttify anything! Abort!";
  }

  const escapedFinal = final
    .split(' ')
    .map(function (part) {
      return validUrl.isUri(part) ? '<' + part + '>' : part;
    })
    .join(' ');

  // Output if no error
  if (err) {
    throw new Error(err);
  }

  return { result: escapedFinal, words: buttifiedWords };
};

export default buttify;
