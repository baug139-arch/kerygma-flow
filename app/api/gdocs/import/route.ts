import { NextRequest, NextResponse } from 'next/server';

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
