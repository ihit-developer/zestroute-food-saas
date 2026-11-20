import { ALL_MODELS } from '../src/models/index.js';

export const migration001 = {
  version: '001_initial_indexes',
  description: 'Ensure all 63 Mongoose collection indexes (unique, compound, text, 2dsphere, TTL, partial) exist.',
  async up(): Promise<void> {
    for (const model of ALL_MODELS) {
      await model.syncIndexes();
    }
  },
};
