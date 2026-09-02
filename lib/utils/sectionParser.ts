export interface ParsedDocSection {
  id: string;
  title: string;
  level: number;
  wordCount: number;
  content: string;
}

export function parseDocumentSections(markdown: string): ParsedDocSection[] {
  const lines = markdown.split('\n');
  const sections: ParsedDocSection[] = [];
  let currentTitle = '';
  let currentLevel = 1;
  let currentLines: string[] = [];
  let currentId = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for H1, H2, H3
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      if (currentLines.length > 0) {
        const text = currentLines.join('\n').trim();
        const words = text.split(/\s+/).filter(Boolean).length;
        if (words > 0) {
          sections.push({
            id: `sec-${currentId++}`,
            title: currentTitle || 'Начало / Введение',
            level: currentLevel,
            wordCount: words,
            content: text,
          });
        }
        currentLines = [];
      }

      if (trimmed.startsWith('# ')) {
        currentTitle = trimmed.replace(/^#\s+/, '').trim();
        currentLevel = 1;
      } else if (trimmed.startsWith('## ')) {
        currentTitle = trimmed.replace(/^##\s+/, '').trim();
        currentLevel = 2;
      } else {
        currentTitle = trimmed.replace(/^###\s+/, '').trim();
        currentLevel = 3;
      }
      currentLines.push(line);
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    const text = currentLines.join('\n').trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words > 0) {
      sections.push({
        id: `sec-${currentId++}`,
        title: currentTitle || 'Основной раздел',
        level: currentLevel,
        wordCount: words,
        content: text,
      });
    }
  }

  return sections;
}
