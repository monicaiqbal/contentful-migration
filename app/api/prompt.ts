const ask_prompt = require('prompt-sync')();
const logger = require('node-color-log');
require('dotenv').config()

/***
 * PROMPT FILE
 ****/

export function setup(): { contentIDs: Array<string>; migrateContent: number; } {
  logger.warn('MAKE SURE YOU SET YOUR .env FILE CORRECTLY BEFORE PROCEEDING!')
  let contentTypes = ask_prompt('Content Type(s) you want to migrate [provide space seperated ids]: ');
  contentTypes = contentTypes.split(' '); /* array of ID's to migrate */

  let migrateContent = ask('Do you want to migrate the content over as well? (Y/N)');

  const contentInfo = migrateContent === 0 ?
    `and to YES to migrating content` : 
    `with NO content migration`;
  logger.log(`\n\nYou want to migrate the following Content ID's: `);
  logger.color('green').log(contentTypes);

  logger.log('\nFrom ').color('yellow').bold().log(process.env.FROM_ENV);

  logger.log('\nTo ').color('yellow').bold().log(process.env.TO_ENV);

  logger.log('\n').bold().underscore().log(contentInfo).log('\n');

  ask('Is this information correct? (Y/N) ', true);

  return {
    contentIDs: contentTypes,
    migrateContent
  }
}

export function ask(text: string, exitOnNo = false) {
  let yn = ask_prompt(text);
  return yesOrNo(yn, exitOnNo);
}

// exits on value that is neither 'y' nor 'n'
export function yesOrNo(value: string | number, exitOnNo = false): number {
  if (value) value = (<string> value).toLowerCase();
  switch(value) {
    case 'n':
      value = 1;
      if (exitOnNo) process.exit(0);
    break;
    case '':
      case 'y':
      value = 0;
    break;
    default:
      logger.color('red').log('Sorry, you did not provide a valid selection!');
      process.exit(1);
  }

  return value;
}
