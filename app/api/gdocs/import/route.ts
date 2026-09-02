import { NextRequest, NextResponse } from 'next/server';
import { convertGoogleDocHtmlToMarkdown } from '@/lib/utils/htmlDecoder';

function extractGoogleDocId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'Ссылка на документ не указана' }, { status: 400 });
    }

    const docId = extractGoogleDocId(url);
    if (!docId) {
      return NextResponse.json(
        { error: 'Неверный формат ссылки. Укажите ссылку вида https://docs.google.com/document/d/.../edit' },
        { status: 400 }
      );
    }

    // Fetch via Google Docs HTML export
    const exportHtmlUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;
    const resHtml = await fetch(exportHtmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (resHtml.ok) {
      const html = await resHtml.text();
      
      let title = 'Импортированная проповедь';
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].replace(/ - Google Документы| - Google Docs/i, '').trim();
      }

      const cleanMarkdown = convertGoogleDocHtmlToMarkdown(html);

      return NextResponse.json({
        success: true,
        docId,
        title: title || 'Проповедь из Google Docs',
        content: cleanMarkdown,
      });
    }

    // Fetch via Google Docs TXT export fallback
    const exportTxtUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    const resTxt = await fetch(exportTxtUrl);

    if (resTxt.ok) {
      const text = await resTxt.text();
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const title = lines[0] || 'Проповедь из Google Docs';

      return NextResponse.json({
        success: true,
        docId,
        title,
        content: text,
      });
    }

    return NextResponse.json(
      {
        error:
          'Документ закрыт настройками приватности. В Google Docs нажмите «Поделиться» и включите доступ «Все, у кого есть ссылка (Просмотр)», после чего повторите попытку.',
      },
      { status: 403 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Ошибка подключения к Google Документам' },
      { status: 500 }
    );
  }
}
