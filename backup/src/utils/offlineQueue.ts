import localforage from "localforage";

interface AttendanceRecord {
  register_number: string;
  status: "present" | "absent" | "late";
}

interface QueuedSubmission {
  id: string;
  session_id: string;
  records: AttendanceRecord[];
  timestamp: number;
}

const QUEUE_KEY = "offline-attendance-submissions";
const API_URL = import.meta.env.VITE_API_URL;

// Configure localForage to use IndexedDB
localforage.config({
  name: "attendance-system",
  storeName: "offline-queue",
  description: "Stores offline attendance submissions until online connection is restored",
});

export async function getQueuedSubmissions(): Promise<QueuedSubmission[]> {
  const data = await localforage.getItem<QueuedSubmission[]>(QUEUE_KEY);
  return data || [];
}

export async function saveQueuedSubmission(session_id: string, records: AttendanceRecord[]): Promise<void> {
  const queue = await getQueuedSubmissions();
  const newSubmission: QueuedSubmission = {
    id: crypto.randomUUID(),
    session_id,
    records,
    timestamp: Date.now(),
  };
  
  queue.push(newSubmission);
  await localforage.setItem(QUEUE_KEY, queue);
}

export async function removeQueuedSubmission(id: string): Promise<void> {
  const queue = await getQueuedSubmissions();
  const updated = queue.filter((item) => item.id !== id);
  await localforage.setItem(QUEUE_KEY, updated);
}

export async function syncOfflineSubmissions(token: string): Promise<{ success: boolean; syncedCount: number }> {
  const queue = await getQueuedSubmissions();
  if (queue.length === 0) {
    return { success: true, syncedCount: 0 };
  }

  let syncedCount = 0;
  let allSuccess = true;

  for (const item of queue) {
    try {
      const response = await fetch(`${API_URL}/sessions/submit-attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: item.session_id,
          records: item.records,
        }),
      });

      if (response.ok) {
        await removeQueuedSubmission(item.id);
        syncedCount++;
      } else {
        allSuccess = false;
      }
    } catch (_err) {
      allSuccess = false;
    }
  }

  return { success: allSuccess, syncedCount };
}
