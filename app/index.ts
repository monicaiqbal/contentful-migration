/*** 
 * App File 
 * ***/
import { setup, ask }from './api/prompt';
import { 
  getContentTypeById,
  getEditerInterfaceById,
  putContentWithTypeId,
  updateContentControlsByContentId,
  createNewContentEntryWithContentId,
  getContentEntries
} from './api/index';
const logger = require('node-color-log');

let migratedIds: Array<string> = [];
let migratedContentEntries: Array<string> = [];

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

function exitHandler(options: any, exitCode: string | number) {
  // announce content type migration stats
  if (migratedIds && migratedIds.length > 0 && promptValues && promptValues.contentIDs.length > 0) {
    logger.color('yellow').bold().log(`\nCompleted: ${migratedIds.length} / ${promptValues.contentIDs.length}`);

    if (migratedIds.length <= promptValues.contentIDs.length) {
      logger.color('green').log(`ID's that were successfully migrated...`);
      logger.color('green').underscore().log(migratedIds.join(' '));

      logger.color('red').log(`\nID's that were not migrated...`);
      logger.color('red').underscore().log(`${promptValues.contentIDs.filter(id => !migratedIds.includes(id)).join(' ')}`);
    }
  } else {
    logger.color('red').log(`No ID's migrated...`);
  }


  // announce content entry migrations
  if (promptValues && promptValues.migrateContent === 0 && promptValues.contentIDs.length > 0 && migratedContentEntries && migratedContentEntries.length > 0) {
    if (migratedContentEntries.length <= promptValues.contentIDs.length) {
      logger.color('green').log(`Entries that were successfully migrated...`);
      logger.color('green').underscore().log(migratedContentEntries.join(' '));

      logger.color('red').log(`\nEntries that were not migrated...`);
      logger.color('red').underscore().log(`${promptValues.contentIDs.filter(id => !migratedContentEntries.includes(id)).join(' ')}`);
    }
  } else if(promptValues.migrateContent === 0) {
    logger.color('red').log(`No entries migrated...`);
  }

  logger.warn('Exiting program...');
}

function delayOneSecond() {
  return new Promise(ok => setTimeout(ok, 1000));
}

// prompt is complete
const promptValues = setup();

migrate();

// migrates with prompts
async function migrate() {
  promptValues.contentIDs.forEach( async (id) => {
    let contentTypeFrom = await getContentTypeById(id);

    // Step 1: check if content type actually exists (or can be retrieved without error)
    if (contentTypeFrom.sys && contentTypeFrom.sys.error !== '') { 
      switch(contentTypeFrom.sys.code) {
        case 0:
          ask('Do you want to continue? (Y/N) ', true);
          break;
        default:
          process.exit(1);
      }
    } else {
      delete contentTypeFrom.sys;

      // create type in TO environment 
      const putContentSuccessful = await putContentWithTypeId(id, process.env.TO_ENV, contentTypeFrom);
      if(putContentSuccessful) {
        // if successfully created, must update all fields to include potential help text
        const editorInterface = await getEditerInterfaceById(id, process.env.FROM_ENV);

        // update fields in TO_ENV
        // this call can be asynchronus
        if(!editorInterface.error) {
          await delayOneSecond();
          updateContentControlsByContentId(id, process.env.TO_ENV, editorInterface.controls)
        }

        // add to migrated ID list (doesn't matter if editorInterface succeeds)
        migratedIds.push(id);

        // only migrate content entries if earlier accepted
        if(promptValues.migrateContent === 0) {
          const entries = await getContentEntries(id);

          // if items to create, loop through and add
          if(!entries.error && entries.items.length > 0) {
            let calls = 0;
            entries.items.forEach(async item => {
              // wait a second after every 5 content entries
              if (calls > 5) {
                await delayOneSecond();
                calls = 0;
              }

              // create content
              createNewContentEntryWithContentId(id, process.env.TO_ENV, item.fields)
              // if at least one entry is migrated we can consider this a success
              .then(res => {
                if (res && !migratedContentEntries.includes(id)) migratedContentEntries.push(id);
              })
              .catch(error => {
                logger.color('red').log(`ERROR:: Could not migrate an entry for ${id}`, error);
              });

            });

          }
        }
      }
    }

    // prevent timeouts from many calls
    await delayOneSecond();
  });
}
