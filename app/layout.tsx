import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kerygma Flow — Кафедра: Режим проповеди',
  description: 'Специализированный суфлер-пульт для спикеров и священнослужителей, синхронизированный с Google Диском и Библией',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className="antialiased select-none">{children}</body>
    </html>
  );
}
