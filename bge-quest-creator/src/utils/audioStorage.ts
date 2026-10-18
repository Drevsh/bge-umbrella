import { get, set, del, createStore } from 'idb-keyval';

// Dedicated IndexedDB store for binary audio blobs so main campaign JSON is never bloated
const audioStore = createStore('questflow_audio_db', 'audio_blobs');

/**
 * Saves a binary audio Blob to IndexedDB under the specified key.
 */
export async function saveQuestAudioBlob(key: string, blob: Blob): Promise<void> {
  await set(key, blob, audioStore);
}

/**
 * Retrieves a binary audio Blob from IndexedDB.
 */
export async function getQuestAudioBlob(key: string): Promise<Blob | null> {
  const blob = (await get(key, audioStore)) as Blob | undefined;
  return blob || null;
}

/**
 * Deletes an audio Blob from IndexedDB.
 */
export async function deleteQuestAudioBlob(key: string): Promise<void> {
  await del(key, audioStore);
}

/**
 * Triggers a browser file download for an audio Blob with the specified filename.
 */
export function triggerAudioFileDownload(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.wav') ? fileName : `${fileName}.wav`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}
