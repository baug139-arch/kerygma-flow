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

export interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime: string;
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

  // Fetch real Google Docs list from Google Drive API
  const fetchFiles = useCallback(async (token: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.document' and trashed = false");
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=30&fields=files(id,name,modifiedTime)`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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

  // Download Google Doc and convert to sermon format
  const getDocumentContent = async (fileId: string): Promise<{ title: string; content: string }> => {
    if (!accessToken) throw new Error('Требуется авторизация в Google');

    setIsLoading(true);
    try {
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
      const fileMeta = files.find((f) => f.id === fileId);
      const title = fileMeta?.name || 'Проповедь из Google Docs';

      const markdown = convertGoogleDocHtmlToMarkdown(html);

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
    refreshFiles: () => accessToken && fetchFiles(accessToken),
    getDocumentContent,
  };
}

function convertGoogleDocHtmlToMarkdown(html: string): string {
  let body = html;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    body = bodyMatch[1];
  }

  body = body.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  body = body.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  body = body.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  body = body.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n### $1\n\n');

  body = body.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');

  body = body.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  body = body.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  body = body.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  body = body.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');

  body = body.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');

  body = body.replace(/<[^>]+>/g, '');

  body = body
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  body = body.replace(/\n{3,}/g, '\n\n').trim();

  return body;
}
