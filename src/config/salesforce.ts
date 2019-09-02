import { Salesforce } from '../lib/salesforce/salesforce';
import { environments } from './environments';
import { logger } from './logger';

export const salesforce = new Salesforce(environments.force, logger);
