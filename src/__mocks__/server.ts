/** MSW server for Node-side Jest runs (file 26). */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
