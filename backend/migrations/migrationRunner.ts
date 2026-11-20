import mongoose, { Schema } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { migration001 } from './001_initial_indexes.js';

const schemaMigrationSchema = new Schema(
  {
    version: { type: String, required: true, unique: true },
    description: { type: String },
    appliedAt: { type: Date, default: Date.now },
  },
  { collection: 'schema_migrations' }
);

const SchemaMigrationModel = mongoose.model('SchemaMigration', schemaMigrationSchema);

const MIGRATIONS = [migration001];

async function runMigrations() {
  await connectDatabase();
  try {
    for (const mig of MIGRATIONS) {
      const existing = await SchemaMigrationModel.findOne({ version: mig.version }).lean();
      if (existing) {
        console.log(`[SKIP] Migration ${mig.version} already applied.`);
        continue;
      }
      console.log(`[RUN] Applying migration ${mig.version}...`);
      await mig.up();
      await SchemaMigrationModel.create({
        version: mig.version,
        description: mig.description,
      });
      console.log(`[DONE] Migration ${mig.version} applied.`);
    }
  } finally {
    await disconnectDatabase();
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
