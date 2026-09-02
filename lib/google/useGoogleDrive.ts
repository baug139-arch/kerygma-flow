'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth, googleDriveProvider } from '@/lib/firebase/config';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';
import { convertGoogleDocHtmlToMarkdown, decodeHtmlEntities } from '@/lib/utils/htmlDecoder';

export interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  mimeType?: string;
  size?: string;
}

export function useGoogleDrive() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved token from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('kerygma_google_access_token');
      const storedEmail = localStorage.getItem('kerygma_google_user_email');
      if (storedToken) setAccessToken(storedToken);
      if (storedEmail) setUserEmail(storedEmail);
    }
  }, []);

  // Track Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user?.email) {
        setUserEmail(user.email);
        localStorage.setItem('kerygma_google_user_email', user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch real Google Docs list from Google Drive API with broad search and 100+ files
  const fetchFiles = useCallback(async (token: string, searchKeyword = '') => {
    setIsLoading(true);
    setError(null);

    try {
      // Broad query for Google Docs, Word Docs, and text files that are not in trash
      let q = "(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'text/plain' or mimeType = 'text/markdown') and trashed = false";

      if (searchKeyword.trim()) {
        const sanitized = searchKeyword.replace(/'/g, "\\'");
        q += ` and (name contains '${sanitized}')`;
      }

      const encodedQ = encodeURIComponent(q);
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodedQ}&orderBy=modifiedTime desc&pageSize=100&fields=files(id,name,modifiedTime,mimeType,size)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setAccessToken(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('kerygma_google_access_token');
          }
          throw new Error('Сессия Google истекла. Пожалуйста, войдите снова.');
        }
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Ошибка загрузки файлов с Google Диска');
      }

      const data = await res.json();
      setFiles(data.files || []);
    } catch (err: any) {
      setError(err.message || 'Не удалось получить список файлов с Google Диска');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Automatically fetch files when access token is present
  useEffect(() => {
    if (accessToken) {
      fetchFiles(accessToken);
    }
  }, [accessToken, fetchFiles]);

  // Seamless Firebase Google Sign-In with Drive scopes
  const login = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await signInWithPopup(auth, googleDriveProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (!token) {
        throw new Error('Не удалось получить токен доступа к Google Диску');
      }

      setAccessToken(token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('kerygma_google_access_token', token);
        if (result.user.email) {
          localStorage.setItem('kerygma_google_user_email', result.user.email);
          setUserEmail(result.user.email);
        }
      }

      await fetchFiles(token);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Окно авторизации было закрыто.');
      } else {
        setError(err.message || 'Ошибка авторизации Google');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // non-critical
    }
    setAccessToken(null);
    setUserEmail(null);
    setFiles([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kerygma_google_access_token');
      localStorage.removeItem('kerygma_google_user_email');
    }
  };

  // Download Google Doc / file and convert to clean sermon format
  const getDocumentContent = async (fileId: string): Promise<{ title: string; content: string }> => {
    if (!accessToken) throw new Error('Требуется авторизация в Google');

    setIsLoading(true);
    try {
      const fileMeta = files.find((f) => f.id === fileId);
      const mimeType = fileMeta?.mimeType || 'application/vnd.google-apps.document';
      const title = fileMeta?.name || 'Проповедь из Google Docs';

      let markdown = '';

      if (mimeType === 'application/vnd.google-apps.document') {
        // Native Google Docs: export to HTML and parse
        const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/html`;
        const res = await fetch(exportUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          throw new Error('Не удалось экспортировать документ из Google Docs');
        }

        const html = await res.text();
        markdown = convertGoogleDocHtmlToMarkdown(html);
      } else {
        // Text / plain / docx / other: fetch direct content
        const fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const res = await fetch(fetchUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          // Fallback export to text/plain
          const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
          const resExport = await fetch(exportUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          if (resExport.ok) {
            const rawText = await resExport.text();
            markdown = decodeHtmlEntities(rawText);
          } else {
            throw new Error('Не удалось прочитать файл с Google Диска');
          }
        } else {
          const rawText = await res.text();
          markdown = decodeHtmlEntities(rawText);
        }
      }

      return {
        title,
        content: markdown,
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentUser,
    accessToken,
    userEmail,
    files,
    isLoading,
    error,
    login,
    logout,
    refreshFiles: (searchKeyword = '') => accessToken && fetchFiles(accessToken, searchKeyword),
    getDocumentContent,
  };
}
