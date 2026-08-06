import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let memoryServer = null;

/**
 * Resolves the connection string. When MONGO_URI is unset in development we
 * boot an ephemeral in-memory MongoDB so the API is usable on a fresh clone
 * with zero setup. Production always requires a real URI.
 */
async function resolveUri() {
  if (config.mongoUri) return config.mongoUri;

  if (config.isProduction) {
    throw new Error('MONGO_URI must be set in production');
  }

  logger.warn('MONGO_URI not set — starting an in-memory MongoDB (data is not persisted)');
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  return memoryServer.getUri('student_os');
}

export async function connectDatabase() {
  mongoose.set('strictQuery', true);

  const uri = await resolveUri();

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15_000,
    autoIndex: !config.isProduction,
  });

  logger.success(`MongoDB connected → ${mongoose.connection.name}`);
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
