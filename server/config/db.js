import mongoose from 'mongoose';

// Whether the connected MongoDB deployment supports multi-document transactions.
// MongoDB Atlas clusters are replica sets, so this is normally true.
let transactionsSupported = false;

export async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGO_URI is missing. Copy .env.example to .env and set your Atlas connection string.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);

  // A replica set (Atlas) or sharded cluster reports a setName / msg in "hello".
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionsSupported = Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch {
    transactionsSupported = false;
  }

  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  console.log(`Transactions: ${transactionsSupported ? 'enabled (replica set)' : 'not available - using compensating rollback'}`);
  return mongoose.connection;
}

export function supportsTransactions() {
  return transactionsSupported;
}
