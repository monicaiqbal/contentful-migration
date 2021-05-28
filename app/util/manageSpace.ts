import { createClient } from 'contentful-management';
import { IManageSpace } from '../interfaces/environment_types';

// api for creating and updating 
export function createManageSpace(manageConfig: IManageSpace) {
  return createClient(manageConfig);
};
