import { supabase } from '../supabase/client'
import * as SQLiteQueue from './sqliteQueue'

export interface QueuedOperation {
  id: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  table_name: string
  payload: Record<string, any>
  created_at: string
}

// Add operation to SQLite outbox queue
export const enqueue = async (op: {
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  payload: Record<string, any>
}) => {
  return await SQLiteQueue.enqueueOperation(op.operation, op.table, op.payload)
}

// Get all pending operations
export const getQueue = async (): Promise<QueuedOperation[]> => {
  return (await SQLiteQueue.getQueuedOperations()) as unknown as QueuedOperation[]
}

// Drain the queue — call this when app comes online
export const drainQueue = async (): Promise<{ success: number; failed: number }> => {
  const queue = await getQueue()
  if (queue.length === 0) return { success: 0, failed: 0 }

  let success = 0
  let failed = 0

  for (const op of queue) {
    try {
      let error = null

      if (op.operation === 'INSERT') {
        let payloadToInsert = op.payload
        if (op.table_name === 'expenses') {
          const allowedKeys = [
            'amount', 'currency', 'category_id', 'title', 'note', 
            'receipt_url', 'expense_date', 'payment_method', 'is_synced', 
            'local_id', 'user_id', 'ai_parsed', 'ai_confidence'
          ]
          const sanitized: any = {}
          for (const key of allowedKeys) {
            if (key in op.payload) {
              sanitized[key] = op.payload[key]
            }
          }
          payloadToInsert = sanitized
        }
        const res = await supabase.from(op.table_name).insert(payloadToInsert)
        error = res.error
      } else if (op.operation === 'UPDATE') {
        const { id, ...rest } = op.payload
        const res = await supabase.from(op.table_name).update(rest).eq('id', id)
        error = res.error
      } else if (op.operation === 'DELETE') {
        const res = await supabase.from(op.table_name).delete().eq('id', op.payload.id)
        error = res.error
      }

      if (!error) {
        await SQLiteQueue.removeQueuedOperation(op.id)
        success++
      } else if (error.code === '23505' || error.message?.includes('duplicate key')) {
        // Already synced — remove from queue
        await SQLiteQueue.removeQueuedOperation(op.id)
        success++
      } else {
        console.warn('Sync failed for op:', op.id, error.message)
        failed++
      }
    } catch (e) {
      console.error('Drain error:', e)
      failed++
    }
  }

  return { success, failed }
}

export const getPendingCount = async (): Promise<number> => (await getQueue()).length