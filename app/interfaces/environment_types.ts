/*** 
 * Important distinctions between these two space access types:
 * Read Space is able to access larger amounts of data
 * but is unable to make any post or update calls.
 *
 * The Manage Space type is available to make post and update calls
 * but can request fewer amounts of data per call
 * ***/
export interface IReadSpace {
  space: string;
  environment: string;
  accessToken: string;
} /* Limited to 7 requests per minute */

export interface IManageSpace {
  accessToken: string;
} /* limited to 55 requests per minute */

