import { db } from '../config/firebase';
import { createExamHistoryRepository } from './examHistoryRepository.js';
import { createHistorySourceReader } from './examHistorySource.js';

export default {
  ...createExamHistoryRepository(db),
  sourceStatus: createHistorySourceReader(db, { baseUrl: import.meta.env.BASE_URL }),
};
