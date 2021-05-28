import { createClient } from 'contentful';
import { IReadSpace } from '../interfaces/environment_types';

// api for reading large data sets
export function createReadSpace(readConfig: IReadSpace ) {
  return createClient(readConfig);
}

