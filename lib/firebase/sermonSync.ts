import { db, auth } from '@/lib/firebase/config';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { Sermon } from '@/lib/types';

const LOCAL_STORAGE_KEY = 'kerygma_sermons';

// 1. Get local sermons fallback
export function getLocalSermons(): Sermon[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// 2. Save sermons locally
export function saveLocalSermons(sermons: Sermon[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sermons));
  } catch {
    // quota exceeded or private mode
  }
}

// 3. Save single sermon to Cloud Firestore & LocalStorage
export async function saveSermonToCloudAndLocal(sermon: Sermon): Promise<void> {
  // Always save locally first for instant offline readiness
  const current = getLocalSermons();
  const existingIdx = current.findIndex((s) => s.id === sermon.id);
  let updated: Sermon[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = sermon;
  } else {
    updated = [sermon, ...current];
  }
  saveLocalSermons(updated);

  // If user is authenticated in Google, sync to Cloud Firestore
  const user = auth.currentUser;
  if (user && db) {
    try {
      const sermonRef = doc(db, 'users', user.uid, 'sermons', sermon.id);
      await setDoc(sermonRef, {
        ...sermon,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Cloud Firestore sync deferred:', err);
    }
  }
}

// 4. Delete sermon from Cloud & Local
export async function deleteSermonFromCloudAndLocal(sermonId: string): Promise<void> {
  const current = getLocalSermons();
  const updated = current.filter((s) => s.id !== sermonId);
  saveLocalSermons(updated);

  const user = auth.currentUser;
  if (user && db) {
    try {
      const sermonRef = doc(db, 'users', user.uid, 'sermons', sermonId);
      await deleteDoc(sermonRef);
    } catch (err) {
      console.warn('Cloud Firestore delete deferred:', err);
    }
  }
}

// 5. Subscribe to real-time cloud sermon updates
export function subscribeToCloudSermons(
  userId: string,
  onUpdate: (sermons: Sermon[]) => void
): () => void {
  if (!db || !userId) return () => {};

  try {
    const sermonsQuery = query(
      collection(db, 'users', userId, 'sermons'),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(sermonsQuery, (snapshot) => {
      const cloudSermons: Sermon[] = [];
      snapshot.forEach((doc) => {
        cloudSermons.push(doc.data() as Sermon);
      });

      if (cloudSermons.length > 0) {
        // Merge with local sermons
        const local = getLocalSermons();
        const mergedMap = new Map<string, Sermon>();

        local.forEach((s) => mergedMap.set(s.id, s));
        cloudSermons.forEach((s) => mergedMap.set(s.id, s));

        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        saveLocalSermons(merged);
        onUpdate(merged);
      }
    }, (err) => {
      console.warn('Firestore subscription error:', err);
    });
  } catch (err) {
    console.warn('Could not setup Firestore subscription:', err);
    return () => {};
  }
}
