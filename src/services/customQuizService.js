import { db } from '../config/firebase';
import { createCustomQuizService } from './customQuizRepository.js';

export default createCustomQuizService(db);
