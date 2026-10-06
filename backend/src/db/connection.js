// ─────────────────────────────────────────────────────────────────────────────
// connection.js — SQLite database connection manager for AgentRelay
// ─────────────────────────────────────────────────────────────────────────────
//
// This module is the SINGLE place in the entire backend that touches the raw
// database file.  Every other module (schema.js, seed.js, future route
// handlers) calls getDb() to obtain a ready-to-use database handle.
// ─────────────────────────────────────────────────────────────────────────────

import Database from 'better-sqlite3';          // 1️⃣ SQLite driver
import path from 'path';                        // 2️⃣ File-path utilities
import { fileURLToPath } from 'url';            // 3️⃣ ESM __dirname polyfill

// ── Recreate __dirname (not available natively in ES Modules) ────────────
const __filename = fileURLToPath(import.meta.url);   // 4️⃣
const __dirname  = path.dirname(__filename);         // 5️⃣

// ── Resolve the database file path ──────────────────────────────────────
const DB_PATH = process.env.DB_PATH
  || path.join(__dirname, '..', '..', 'lcp.db');

// ── Module-level variable (the singleton slot) ──────────────────────────
let db;                                           // 7️⃣

/**
 * Returns the singleton SQLite database connection.
 * Creates the connection on first call with WAL mode and foreign keys enabled.
 *
 * @returns {import('better-sqlite3').Database}
 */
export function getDb() {                         // 8️⃣
  if (!db) {                                      // 9️⃣
    db = new Database(DB_PATH);                   // 10️⃣

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');              // 11️⃣

    // Enforce foreign key constraints
    db.pragma('foreign_keys = ON');               // 12️⃣

    console.log(`[DB] Connected to SQLite at ${DB_PATH}`);
  }
  return db;                                      // 13️⃣
}

/**
 * Gracefully closes the database connection.
 * Call this during server shutdown.
 */
export function closeDb() {                       // 14️⃣
  if (db) {
    db.close();                                   // 15️⃣
    db = null;                                    // 16️⃣
    console.log('[DB] Connection closed');
  }
}
