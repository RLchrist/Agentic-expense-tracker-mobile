import { createMMKV } from 'react-native-mmkv'
import { supabase } from '../supabase/client'

const storage = createMMKV({ id: 'offline-queue' })
const QUEUE_KEY = 'pending_operations'

export interface QueuedOperation {
  id: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  payload: Record<string, any>
  createdAt: string
}

// Add operation to local queue
export const enqueue = (op: Omit<QueuedOperation, 'id' | 'createdAt'>) => {
  const queue = getQueue()
  const newOp: QueuedOperation = {
    ...op,
    id: Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
  }
  queue.push(newOp)
  storage.set(QUEUE_KEY, JSON.stringify(queue))
  return newOp.id
}

// Get all pending operations
export const getQueue = (): QueuedOperation[] => {
  try {
    const raw = storage.getString(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// Remove operation from queue after successful sync
const dequeue = (id: string) => {
  const queue = getQueue().filter((op) => op.id !== id)
  storage.set(QUEUE_KEY, JSON.stringify(queue))
}

// Drain the queue — call this when app comes online
export const drainQueue = async (): Promise<{ success: number; failed: number }> => {
  const queue = getQueue()
  if (queue.length === 0) return { success: 0, failed: 0 }

  let success = 0
  let failed = 0

  for (const op of queue) {
    try {
      let error = null

      if (op.operation === 'INSERT') {
        const res = await supabase.from(op.table).insert(op.payload)
        error = res.error
      } else if (op.operation === 'UPDATE') {
        const { id, ...rest } = op.payload
        const res = await supabase.from(op.table).update(rest).eq('id', id)
        error = res.error
      } else if (op.operation === 'DELETE') {
        const res = await supabase.from(op.table).delete().eq('id', op.payload.id)
        error = res.error
      }

      if (!error) {
        dequeue(op.id)
        success++
      } else if (error.code === '23505' || error.message?.includes('duplicate key')) {
        // Already synced — remove from queue
        console.log('Already synced, dequeuing op:', op.id)
        dequeue(op.id)
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

export const getPendingCount = (): number => getQueue().length