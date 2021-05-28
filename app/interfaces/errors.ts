export interface ContentfulReturnError {
  sys: {
    type: string;
    id: string; 
  }; 
  message: string;
  details: {
    type: string;
    id: string;
    environment: string;
    space: string;
  };
  requestId: string;
}

export type ApplicationReturnObject = any | { sys: { error: string; code: number; } };
