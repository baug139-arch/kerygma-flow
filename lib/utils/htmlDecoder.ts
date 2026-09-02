export function decodeHtmlEntities(text: string): string {
  if (!text) return '';

  let decoded = text
    // Decimal entities: &#1050; -> К
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return _;
      }
    })
    // Hex entities: &#x41A; -> К
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return _;
      }
    });

  // Named entities
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&laquo;': '«',
    '&raquo;': '»',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&ldquo;': '“',
    '&rdquo;': '”',
    '&lsquo;': '‘',
    '&rsquo;': '’',
  };

  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replaceAll(entity, char);
  }

  // If there were double-encoded entities like &amp;#1050;
  if (/&#\d+;/.test(decoded) || /&#x[0-9a-fA-F]+;/.test(decoded)) {
    decoded = decoded
      .replace(/&#(\d+);/g, (_, dec) => {
        try {
          return String.fromCodePoint(parseInt(dec, 10));
        } catch {
          return _;
        }
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        try {
          return String.fromCodePoint(parseInt(hex, 16));
        } catch {
          return _;
        }
      });
  }

  return decoded;
}

export function convertGoogleDocHtmlToMarkdown(html: string): string {
  if (!html) return '';

  let body = html;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    body = bodyMatch[1];
  }

  // Remove script, style tags
  body = body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Headers
  body = body.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n');
  body = body.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n');
  body = body.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n');
  body = body.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n### $1\n\n');

  // Paragraphs and breaks
  body = body.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');
  body = body.replace(/<br\s*[\/]?>/gi, '\n');

  // Bold & Italic
  body = body.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  body = body.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  body = body.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  body = body.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');

  // Lists
  body = body.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');

  // Strip remaining HTML tags
  body = body.replace(/<[^>]+>/g, '');

  // Decode HTML character entities to real unicode characters
  body = decodeHtmlEntities(body);

  // Clean extra whitespace and blank lines
  body = body.replace(/\r\n/g, '\n');
  body = body.replace(/[ \t]+\n/g, '\n');
  body = body.replace(/\n{3,}/g, '\n\n').trim();

  return body;
}
