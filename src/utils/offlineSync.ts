/**
 * Offline Sync Utility for KisaanSetu PWA
 * Handles saving draft submissions to browser storage when offline
 * and automatically syncing pending records when network connectivity resumes.
 */

export interface OfflineDraft<T = unknown> {
  id: string;
  type: string;
  data: T;
  createdAt: string;
}

const OFFLINE_QUEUE_KEY = 'kisaansetu_offline_queue';

/**
 * Save an offline action/draft to localStorage queue
 */
export function saveOfflineDraft<T>(type: string, data: T): OfflineDraft<T> {
  const existingQueue = getOfflineQueue();
  const draft: OfflineDraft<T> = {
    id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type,
    data,
    createdAt: new Date().toISOString(),
  };

  existingQueue.push(draft);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(existingQueue));
  return draft;
}

/**
 * Retrieve all queued offline drafts
 */
export function getOfflineQueue(): OfflineDraft[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to parse offline queue from storage:', err);
    return [];
  }
}

/**
 * Remove a specific draft from the offline queue after successful sync
 */
export function removeOfflineDraft(id: string): void {
  const queue = getOfflineQueue();
  const updatedQueue = queue.filter((item) => item.id !== id);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
}

/**
 * Clear all offline drafts
 */
export function clearOfflineQueue(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

/**
 * Setup automatic background sync listener when device comes back online
 */
export function initOfflineAutoSync(syncHandler: (draft: OfflineDraft) => Promise<boolean>): void {
  window.addEventListener('online', async () => {
    console.log('Network restored. Checking offline queue for sync...');
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    for (const draft of queue) {
      try {
        const success = await syncHandler(draft);
        if (success) {
          removeOfflineDraft(draft.id);
          console.log(`Successfully synced offline draft ${draft.id}`);
        }
      } catch (error) {
        console.error(`Failed to sync offline draft ${draft.id}:`, error);
      }
    }
  });
}
