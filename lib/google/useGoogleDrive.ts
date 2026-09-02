'use client';

import { useState, useEffect, useCallback } from 'react';

export interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly';

export function useGoogleDrive() {
  const [clientId, setClientId] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGsiLoaded, setIsGsiLoaded] = useState<boolean>(false);

  // Load client ID from env or localStorage
  useEffect(() => {
    const envClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '736137736866-gp99nankl7csfifn5nlsllolacjdpqgv.apps.googleusercontent.com';
    const storedClientId = typeof window !== 'undefined' ? localStorage.getItem('kerygma_google_client_id') || '' : '';
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('kerygma_google_access_token') : null;
    const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('kerygma_google_user_email') : null;

    const activeId = storedClientId || envClientId;
    setClientId(activeId);
    if (storedToken) setAccessToken(storedToken);
    if (storedEmail) setUserEmail(storedEmail);
  }, []);

  // Dynamically load Google Identity Services Script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.google?.accounts?.oauth2) {
      setIsGsiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setIsGsiLoaded(true);
    document.body.appendChild(script);

    return () => {
      // Keep script in head/body
    };
  }, []);

  const saveClientId = (newId: string) => {
    setClientId(newId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kerygma_google_client_id', newId);
    }
  };

  // Fetch real Google Docs list using access token
  const fetchFiles = useCallback(async (token: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Query Google Drive API for Google Docs files
      const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.document' and trashed = false");
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=25&fields=files(id,name,modifiedTime)`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          // Token expired
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

      // Also get user info if email is not set
      if (!userEmail) {
        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.email) {
              setUserEmail(userData.email);
              localStorage.setItem('kerygma_google_user_email', userData.email);
            }
          }
        } catch {
          // non-critical
        }
      }
    } catch (err: any) {
      setError(err.message || 'Не удалось получить список файлов');
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  // Load files automatically if token exists
  useEffect(() => {
    if (accessToken) {
      fetchFiles(accessToken);
    }
  }, [accessToken, fetchFiles]);

  // Trigger Google OAuth 2.0 Pop-up
  const login = () => {
    if (!clientId) {
      setError('Для прямого доступа укажите Google Client ID');
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      setError('Модуль Google Identity еще загружается. Попробуйте через секунду.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) {
            setError(`Ошибка авторизации: ${response.error}`);
            setIsLoading(false);
            return;
          }

          if (response.access_token) {
            const token = response.access_token;
            setAccessToken(token);
            if (typeof window !== 'undefined') {
              localStorage.setItem('kerygma_google_access_token', token);
            }
            fetchFiles(token);
          }
        },
      });

      client.requestAccessToken();
    } catch (err: any) {
      setError(err.message || 'Ошибка запуска окна авторизации Google');
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAccessToken(null);
    setUserEmail(null);
    setFiles([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kerygma_google_access_token');
      localStorage.removeItem('kerygma_google_user_email');
    }
  };

  // Download Google Doc content in HTML and convert to sermon format
  const getDocumentContent = async (fileId: string): Promise<{ title: string; content: string }> => {
    if (!accessToken) throw new Error('Требуется авторизация в Google');

    setIsLoading(true);
    try {
      // 1. Export as HTML
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
    clientId,
    saveClientId,
    accessToken,
    userEmail,
    files,
    isLoading,
    error,
    isGsiLoaded,
    login,
    logout,
    refreshFiles: () => accessToken && fetchFiles(accessToken),
    getDocumentContent,
  };
}

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
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
