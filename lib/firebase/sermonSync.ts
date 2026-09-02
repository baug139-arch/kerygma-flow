import { db, auth, googleDriveProvider } from '@/lib/firebase/config';
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
import { signInWithPopup, signOut, GoogleAuthProvider, User } from 'firebase/auth';
import { Sermon } from '@/lib/types';
import { SAMPLE_SERMONS } from '@/lib/sampleSermons';

const LOCAL_STORAGE_KEY = 'kerygma_sermons';

// 1. Get local sermons fallback (including legacy keys)
export function getLocalSermons(): Sermon[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    const legacyList = localStorage.getItem('kerygma_sermons_list');
    if (legacyList) {
      const parsed = JSON.parse(legacyList);
      if (Array.isArray(parsed) && parsed.length > 0) {
        saveLocalSermons(parsed);
        return parsed;
      }
    }

    return [];
  } catch {
    return [];
  }
}

// 2. Save sermons locally
export function saveLocalSermons(sermons: Sermon[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sermons));
    // Also save legacy key for maximum compatibility
    localStorage.setItem('kerygma_sermons_list', JSON.stringify(sermons));
  } catch {
    // quota exceeded or private mode
  }
}

// 3. Save single sermon to Cloud Firestore & LocalStorage
export async function saveSermonToCloudAndLocal(sermon: Sermon): Promise<void> {
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

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`kerygma_sermon_${sermon.id}`, JSON.stringify(sermon));
    } catch {}
  }

  // If user is authenticated in Google, sync to Cloud Firestore
  const user = auth.currentUser;
  if (user && db) {
    try {
      const sermonRef = doc(db, 'users', user.uid, 'sermons', sermon.id);
      await setDoc(
        sermonRef,
        {
          ...sermon,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
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

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`kerygma_sermon_${sermonId}`);
    } catch {}
  }

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

// 5. Full Two-Way Synchronization (Merges Cloud + Local)
export async function syncAllLocalAndCloudSermons(userId: string): Promise<Sermon[]> {
  if (!db || !userId) return getLocalSermons();

  try {
    const localSermons = getLocalSermons();
    const sermonsRef = collection(db, 'users', userId, 'sermons');
    const snapshot = await getDocs(sermonsRef);

    const cloudSermons: Sermon[] = [];
    snapshot.forEach((doc) => {
      cloudSermons.push(doc.data() as Sermon);
    });

    const mergedMap = new Map<string, Sermon>();

    // Put cloud sermons first
    cloudSermons.forEach((s) => mergedMap.set(s.id, s));

    // Put local sermons and upload any missing local ones to cloud
    for (const local of localSermons) {
      const existingCloud = mergedMap.get(local.id);
      if (!existingCloud) {
        mergedMap.set(local.id, local);
        // Upload local to cloud
        const sRef = doc(db, 'users', userId, 'sermons', local.id);
        await setDoc(sRef, local, { merge: true }).catch(() => {});
      } else {
        // Keep the more recently updated one
        const cloudTime = new Date(existingCloud.updatedAt || 0).getTime();
        const localTime = new Date(local.updatedAt || 0).getTime();
        if (localTime > cloudTime) {
          mergedMap.set(local.id, local);
          const sRef = doc(db, 'users', userId, 'sermons', local.id);
          await setDoc(sRef, local, { merge: true }).catch(() => {});
        }
      }
    }

    const mergedList = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    saveLocalSermons(mergedList);
    return mergedList;
  } catch (err) {
    console.warn('Sync error:', err);
    return getLocalSermons();
  }
}

// 6. Real-time Cloud subscription
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

    return onSnapshot(
      sermonsQuery,
      (snapshot) => {
        const cloudSermons: Sermon[] = [];
        snapshot.forEach((doc) => {
          cloudSermons.push(doc.data() as Sermon);
        });

        if (cloudSermons.length > 0) {
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
      },
      (err) => {
        console.warn('Firestore subscription error:', err);
      }
    );
  } catch (err) {
    console.warn('Could not setup Firestore subscription:', err);
    return () => {};
  }
}

// 7. Quick Google Auth helper for navbar
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleDriveProvider);
    const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('kerygma_google_access_token', token);
      if (result.user.email) {
        localStorage.setItem('kerygma_google_user_email', result.user.email);
      }
    }
    if (result.user) {
      await syncAllLocalAndCloudSermons(result.user.uid);
    }
    return result.user;
  } catch (err: any) {
    console.error('Google sign in error:', err);
    return null;
  }
}

export async function logoutGoogle(): Promise<void> {
  try {
    await signOut(auth);
  } catch {}
  if (typeof window !== 'undefined') {
    localStorage.removeItem('kerygma_google_access_token');
    localStorage.removeItem('kerygma_google_user_email');
  }
}
