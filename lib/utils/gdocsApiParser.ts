import { decodeHtmlEntities } from './htmlDecoder';
import { ParsedDocSection } from './sectionParser';

export interface GDocTab {
  id: string;
  title: string;
  content: string;
  wordCount: number;
}

// Convert a Google Docs API StructuralElement[] body to formatted Markdown
export function convertDocsApiBodyToMarkdown(elements: any[]): string {
  if (!Array.isArray(elements)) return '';

  const mdParts: string[] = [];

  for (const el of elements) {
    if (el.paragraph) {
      const p = el.paragraph;
      const namedStyle = p.paragraphStyle?.namedStyleType || 'NORMAL_TEXT';
      const bullet = p.bullet;

      let pText = '';
      if (Array.isArray(p.elements)) {
        for (const pe of p.elements) {
          if (pe.textRun?.content) {
            let runText = pe.textRun.content;
            const style = pe.textRun.textStyle || {};

            // Strip trailing newline from runText before formatting
            const hasTrailingNewline = runText.endsWith('\n');
            if (hasTrailingNewline) {
              runText = runText.slice(0, -1);
            }

            if (runText) {
              if (style.bold && style.italic) {
                runText = `***${runText}***`;
              } else if (style.bold) {
                runText = `**${runText}**`;
              } else if (style.italic) {
                runText = `*${runText}*`;
              }
            }

            pText += runText + (hasTrailingNewline ? '\n' : '');
          }
        }
      }

      const trimmedP = pText.trim();
      if (!trimmedP) {
        continue;
      }

      // Check Heading Styles
      if (namedStyle === 'TITLE' || namedStyle === 'HEADING_1') {
        mdParts.push(`# ${trimmedP}`);
      } else if (namedStyle === 'HEADING_2') {
        mdParts.push(`## ${trimmedP}`);
      } else if (namedStyle === 'HEADING_3') {
        mdParts.push(`### ${trimmedP}`);
      } else if (bullet) {
        mdParts.push(`- ${trimmedP}`);
      } else {
        mdParts.push(trimmedP);
      }
    } else if (el.table) {
      // Basic table extraction
      const table = el.table;
      if (Array.isArray(table.tableRows)) {
        for (const row of table.tableRows) {
          const rowTexts: string[] = [];
          for (const cell of row.tableCells || []) {
            const cellContent = convertDocsApiBodyToMarkdown(cell.content || []).trim();
            if (cellContent) rowTexts.push(cellContent);
          }
          if (rowTexts.length > 0) {
            mdParts.push(rowTexts.join(' | '));
          }
        }
      }
    }
  }

  return mdParts.join('\n\n');
}

// Extract all tabs from Google Docs API v1 response
export function extractTabsFromDocsApiResponse(docJson: any): GDocTab[] {
  if (!docJson) return [];

  const tabs: GDocTab[] = [];

  if (Array.isArray(docJson.tabs) && docJson.tabs.length > 0) {
    for (const tab of docJson.tabs) {
      const tabProps = tab.tabProperties || {};
      const tabId = tabProps.tabId || `tab-${tabs.length}`;
      const tabTitle = tabProps.title || `Вкладка ${tabs.length + 1}`;
      const bodyElements = tab.documentTab?.body?.content || [];
      const markdown = convertDocsApiBodyToMarkdown(bodyElements);
      const wordCount = markdown.split(/\s+/).filter(Boolean).length;

      tabs.push({
        id: tabId,
        title: tabTitle,
        content: markdown,
        wordCount,
      });
    }
  } else if (docJson.body?.content) {
    // Single tab document fallback
    const markdown = convertDocsApiBodyToMarkdown(docJson.body.content);
    const wordCount = markdown.split(/\s+/).filter(Boolean).length;
    tabs.push({
      id: 'main',
      title: docJson.title || 'Документ',
      content: markdown,
      wordCount,
    });
  }

  return tabs;
}
