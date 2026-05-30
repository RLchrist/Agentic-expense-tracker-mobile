import * as SQLite from 'expo-sqlite'

const DB_NAME = 'expense_tracker_queue.db'

export const initQueueDb = async () => {
  const db = await SQLite.openDatabaseAsync(DB_NAME)
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS outbox_queue (
      id TEXT PRIMARY KEY NOT NULL,
      operation TEXT NOT NULL,
      table_name TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)
  return db
}

export const enqueueOperation = async (
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  table: string,
  payload: any
) => {
  const db = await initQueueDb()
  const id = Math.random().toString(36).substring(7)
  await db.runAsync(
    'INSERT INTO outbox_queue (id, operation, table_name, payload) VALUES (?, ?, ?, ?)',
    [id, operation, table, JSON.stringify(payload)]
  )
  return id
}

export const getQueuedOperations = async () => {
  const db = await initQueueDb()
  const rows = await db.getAllAsync<{
    id: string;
    operation: string;
    table_name: string;
    payload: string;
    created_at: string;
  }>('SELECT * FROM outbox_queue ORDER BY created_at ASC')
  
  return rows.map(row => ({
    ...row,
    payload: JSON.parse(row.payload)
  }))
}

export const removeQueuedOperation = async (id: string) => {
  const db = await initQueueDb()
  await db.runAsync('DELETE FROM outbox_queue WHERE id = ?', [id])
}
