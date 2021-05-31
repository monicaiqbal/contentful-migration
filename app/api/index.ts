import { createReadSpace } from '../util/readSpace';
import { createManageSpace } from '../util/manageSpace';
import { ContentfulReturnError, ApplicationReturnObject } from '../interfaces/errors';
import { EditorInterfaceControlItem } from '../interfaces/contentful';
const logger = require('node-color-log');
const { spawn } = require('child_process');

const read = createReadSpace({
  space: process.env.SPACE,
  environment: process.env.FROM_ENV,
  accessToken: process.env.READ_ACCESS_TOKEN
});

const manage = createManageSpace({
  accessToken: process.env.MANAGE_ACCESS_TOKEN
});

/***
 * cli view start
 * **/
async function contentful_command(args: Array<string>) {
  const prearg = ['--management-token', process.env.MANAGE_ACCESS_TOKEN, '--space-id', process.env.SPACE,];
  args = args.concat(prearg);
  const child = spawn('contentful', args);

  let data = '';
  for await (const chunk of child.stdout) {
    console.log('stdout chunk: '+chunk);
    data += chunk;
  }

  let error = '';
  for await (const chunk of child.stderr) {
    console.error('stderr chunk: '+chunk);
    error += chunk;
  }

  return child.stdout;
};

export async function get_content_by_type_id(id, envID) {
  return contentful_command(['content-type', 'get',  '--id', id, ' --environment-id', envID]);
}
/***
 * cli view end
 * **/

/***
 * reusing code  from iSTrackingID clear project
 * **/
export async function getAllContentTypes() {
  return read.getContentTypes({ limit: 1000 })
    .then(res => res.items)
    .catch(e => console.error('getAllContentTypes - ERROR::', e));
}

export async function getContentTypeById(id: string): Promise<ApplicationReturnObject> {
  return read.getContentType(id)
  .then(res => handleRequestSuccess(res))
  .catch(e => handleRequestError(e, 'getAllContentTypes'));
}

export async function getEditerInterfaceById(id: string, env: string): Promise<ApplicationReturnObject> {
  return manage.getSpace(process.env.SPACE)
  .then((space) => space.getEnvironment(env))
  .catch(e => handleRequestError(e, 'getEditerInterfaceById -- SPACE'))
  .then((environment) => environment.getEditorInterfaceForContentType(id))
  .catch(e => handleRequestError(e, 'getEditerInterfaceById -- ENV'))
  .then(res => handleRequestSuccess(res))
  .catch(e => handleRequestError(e, 'getEditerInterfaceById'));
}

export function getContentControlSettings(controlItem: EditorInterfaceControlItem): any {
  return (controlItem && controlItem.settings) ? controlItem.settings : {};
}

export async function putContentWithTypeId(id: string, env: string, content: any): Promise<boolean> {
  return manage.getSpace(process.env.SPACE)
  .then(space => space.getEnvironment(env))
  .then(environment => environment.getContentType(id))
  .then(contentType => {
    // if content already exists
    contentType.displayField = content.displayField;
    contentType.description = content.description;
    contentType.fields = content.fields;
    contentType.update();
    contentType.publish();

    logger.color('green').log(`Content Type ${id} has been updated in ${env}!`);
    return true;
  })
  .catch(error => {
    // if content does not yet exist
    if (error.name == 'NotFound') {
      return createNewContentTypeWithId(id, env, content);
    } else {
      logger.color('red').underscore().log(`ERROR: putContentWithTypeId`, error);
      return false;
    }
  });
}

export async function createNewContentTypeWithId(id: string, env: string, content: any): Promise<boolean> {
  return manage.getSpace(process.env.SPACE)
  .then((space) => space.getEnvironment(env))
  .then((environment) => environment.createContentTypeWithId(id, content))
  .then(res => {
    res.publish();
    logger.color('green').log(`Content Type ${id} has been created in ${env}!`);

    return true;
  })
  .catch(e => {
    logger.color('red').underscore().log(`ERROR: createContentTypeWithId`, e);
    return false;
  });
}

export async function updateContentControlsByContentId(id: string, env: string, content: Array<EditorInterfaceControlItem>): Promise<boolean> {
  if (!content) return false;

  return manage.getSpace(process.env.SPACE)
  .then((space) => space.getEnvironment(env))
  .then((environment) => environment.getEditorInterfaceForContentType(id))
  .then((editorInterface) => {
    logger.log(`${id} controls: `, editorInterface.controls)
    logger.log(`Being updated to: `, content)
    editorInterface.controls = content;
    return editorInterface;
  })
  .then(res => {
    res.update()
    logger.color('green').log(`Successfully updated help text in fields for ${id} in ${env}`);
    return true;
  })
  .catch(e => {
    logger.color('red').underscore().log(`ERROR: updateContentControlsByContentId`, e);
    return false;
  });
}

export async function getContentEntries(content_type: string): Promise<ApplicationReturnObject> {
  return read.getEntries({
    content_type,
    limit: 500
  })
  .catch(e => handleRequestError(e, 'getContentEntries -- immediate'))
  .then(res => handleRequestSuccess(res))
  .catch(e => handleRequestError(e, 'getContentEntries'));
}

// create new content entries, but WILL NOT publish them
export async function createNewContentEntryWithContentId(id: string, env: string, entry: any): Promise<boolean> {
  return manage.getSpace(process.env.SPACE)
  .then((space) => space.getEnvironment(env))
  .then((environment) => environment.createEntry(id, entry))
  .then(res => {
    logger.color('green').log(`Successfully created an entry for ${id} in ${env}`);
    return true;
  })
  .catch(e => {
    logger.color('red').underscore().log(`ERROR: createNewContentEntryWithContentId`, e);
    return false;
  });
}

function handleRequestSuccess(res: any): ApplicationReturnObject {
  try {
    res.sys.error = '';
  } catch(e) {
    res.sys = { error: '' };
  }

  res.sys.code = null;

  return res;
}

// ID NotFound can be safely ignored
// return 0 if we can safely ignore this error
// otherwise return 1 for more problematic error
function handleRequestError(error: ContentfulReturnError, name: string): ApplicationReturnObject  {
  logger.color('red').log(name, error);
  let errorObj = {
    sys: {
      error: '',
      code: 0
    }
  };

  // special message if type is not found
  if(error.sys.id === 'NotFound') {
    logger.color('red').bold().log(`ERROR: Sorry, could not find contentType with ID: `)
    .color('green').underscore().log(`${error.details.id}`)
    .color('red').bold().log(`in`)
    .color('green').underscore().log(`${error.details.environment}`);
  } else {
    errorObj.sys.code = 1;
    logger.error(`ERROR: ${error.message}`);
  }

  errorObj.sys.error = error.message;

  return errorObj; 
}
