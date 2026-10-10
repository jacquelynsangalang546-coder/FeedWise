import mongoose from 'mongoose';
import { supportsTransactions } from '../config/db.js';

/**
 * Runs a group of database writes as ONE unit: either all succeed or none do.
 *
 * - On MongoDB Atlas (a replica set) a real multi-document transaction is used.
 *   If anything throws, MongoDB aborts the transaction and nothing is saved.
 * - On a standalone local MongoDB (no transactions), every successful step
 *   registers an "undo" action with onRollback(). If a later step fails,
 *   the undo actions run in reverse order (compensating rollback).
 *
 * work receives { session, opts, onRollback } where opts is the options object
 * to pass to every Mongoose write ({ session } or {}).
 */
export async function runAtomic(work) {
  if (supportsTransactions()) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work({ session, opts: { session }, onRollback: () => {} });
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  const undoSteps = [];
  try {
    return await work({ session: null, opts: {}, onRollback: (step) => undoSteps.push(step) });
  } catch (error) {
    for (const undo of undoSteps.reverse()) {
      try {
        await undo();
      } catch (undoError) {
        console.error('Rollback step failed:', undoError);
      }
    }
    throw error;
  }
}
