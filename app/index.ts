/*** 
 * App File 
 * ***/
import { setup, ask }from './api/prompt';
import { getContentTypeById, getEditerInterfaceById,putContentWithTypeId, updateContentControlsByContentId } from './api/index';
const logger = require('node-color-log');

let migratedIds: Array<string> = [];

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
  if (migratedIds && migratedIds.length > 0 && promptValues && promptValues.contentIDs.length > 0) {
    logger.color('yellow').bold().log(`\nCompleted: ${migratedIds.length} / ${promptValues.contentIDs.length}`);

    if (migratedIds.length < promptValues.contentIDs.length) {
      logger.color('green').log(`ID's that were successfully migrated...`);
      logger.color('green').underscore().log(migratedIds.join(' '));

      logger.color('red').log(`\nID's that were not migrated...`);
      logger.color('red').underscore().log(`${promptValues.contentIDs.filter(id => !migratedIds.includes(id)).join(' ')}`);
    }
  } else {
    logger.color('red').log(`No ID's migrated...`);
  }

  logger.warn('Exiting program...');
}

function delayOneSecond() {
  return new Promise(ok => setTimeout(ok, 1000));
}

// prompt is complete
const promptValues = setup();

migrate();

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
        updateContentControlsByContentId(id, process.env.TO_ENV, editorInterface.controls)
        migratedIds.push(id);
      }
    }

    // prevent timeouts from many calls
    await delayOneSecond();
  });
}
