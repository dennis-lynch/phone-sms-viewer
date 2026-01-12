/**
 * Export IPC Handlers
 *
 * Handles message export in various formats:
 * - Plain Text
 * - CSV
 * - JSON
 * - HTML
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { Message, ExportOptions } from '../../shared/types';

/**
 * Format a timestamp for export
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format ISO timestamp for CSV/JSON
 */
function formatISOTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Export messages as plain text
 */
function exportAsText(messages: Message[], options: ExportOptions): string {
  const lines: string[] = [];

  for (const msg of messages) {
    const parts: string[] = [];

    if (options.includeTimestamps) {
      parts.push(`[${formatTimestamp(msg.timestamp)}]`);
    }

    if (options.includeContactNames && msg.contactName) {
      parts.push(`${msg.contactName}:`);
    } else {
      parts.push(msg.direction === 'sent' ? 'Me:' : 'Them:');
    }

    parts.push(msg.body);

    lines.push(parts.join(' '));
  }

  return lines.join('\n');
}

/**
 * Escape a value for CSV (handle quotes and commas)
 */
function escapeCSV(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export messages as CSV
 */
function exportAsCSV(messages: Message[], options: ExportOptions): string {
  const headers: string[] = [];
  if (options.includeTimestamps) headers.push('Timestamp');
  if (options.includeContactNames) headers.push('Contact');
  headers.push('Direction', 'Message');

  const lines: string[] = [headers.join(',')];

  for (const msg of messages) {
    const row: string[] = [];

    if (options.includeTimestamps) {
      row.push(formatISOTimestamp(msg.timestamp));
    }

    if (options.includeContactNames) {
      row.push(escapeCSV(msg.contactName || ''));
    }

    row.push(msg.direction);
    row.push(escapeCSV(msg.body));

    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Export messages as JSON
 */
function exportAsJSON(messages: Message[], options: ExportOptions): string {
  const exportData = messages.map((msg) => {
    const obj: Record<string, unknown> = {
      direction: msg.direction,
      body: msg.body,
    };

    if (options.includeTimestamps) {
      obj.timestamp = formatISOTimestamp(msg.timestamp);
      obj.timestampMs = msg.timestamp;
    }

    if (options.includeContactNames) {
      obj.contactName = msg.contactName;
      obj.phoneNumber = msg.originalPhone;
    }

    return obj;
  });

  return JSON.stringify(exportData, null, 2);
}

/**
 * Escape HTML entities
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

/**
 * Export messages as HTML
 */
function exportAsHTML(messages: Message[], options: ExportOptions, title: string): string {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1f2937;
      color: #f3f4f6;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      margin-bottom: 20px;
      color: #fff;
    }
    .message {
      display: flex;
      margin-bottom: 8px;
    }
    .message.sent { justify-content: flex-end; }
    .message.received { justify-content: flex-start; }
    .bubble {
      max-width: 70%;
      padding: 10px 14px;
      border-radius: 18px;
      word-wrap: break-word;
    }
    .sent .bubble {
      background: #3b82f6;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .received .bubble {
      background: #374151;
      color: white;
      border-bottom-left-radius: 4px;
    }
    .meta {
      font-size: 11px;
      margin-top: 4px;
      opacity: 0.7;
    }
    .sent .meta { text-align: right; }
    .received .meta { text-align: left; }
    .body { white-space: pre-wrap; }
    .date-sep {
      text-align: center;
      padding: 12px;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <h1>${escapeHTML(title)}</h1>
  <div class="messages">
`;

  const parts: string[] = [html];
  let currentDate = '';

  for (const msg of messages) {
    const msgDate = new Date(msg.timestamp).toDateString();

    // Add date separator
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      parts.push(`    <div class="date-sep">${escapeHTML(msgDate)}</div>\n`);
    }

    const direction = msg.direction;
    parts.push(`    <div class="message ${direction}">\n`);
    parts.push(`      <div>\n`);
    parts.push(`        <div class="bubble">\n`);
    parts.push(`          <div class="body">${escapeHTML(msg.body)}</div>\n`);
    parts.push(`        </div>\n`);

    if (options.includeTimestamps || options.includeContactNames) {
      parts.push(`        <div class="meta">\n`);
      const metaParts: string[] = [];
      if (options.includeContactNames && msg.contactName) {
        metaParts.push(escapeHTML(msg.contactName));
      }
      if (options.includeTimestamps) {
        metaParts.push(formatTimestamp(msg.timestamp));
      }
      parts.push(`          ${metaParts.join(' - ')}\n`);
      parts.push(`        </div>\n`);
    }

    parts.push(`      </div>\n`);
    parts.push(`    </div>\n`);
  }

  parts.push(`  </div>
</body>
</html>`);

  return parts.join('');
}

/**
 * Get file extension for format
 */
function getExtension(format: ExportOptions['format']): string {
  switch (format) {
    case 'text': return 'txt';
    case 'csv': return 'csv';
    case 'json': return 'json';
    case 'html': return 'html';
    default: return 'txt';
  }
}

/**
 * Get file filter for format
 */
function getFileFilter(format: ExportOptions['format']): Electron.FileFilter[] {
  switch (format) {
    case 'text':
      return [{ name: 'Text Files', extensions: ['txt'] }];
    case 'csv':
      return [{ name: 'CSV Files', extensions: ['csv'] }];
    case 'json':
      return [{ name: 'JSON Files', extensions: ['json'] }];
    case 'html':
      return [{ name: 'HTML Files', extensions: ['html'] }];
    default:
      return [{ name: 'All Files', extensions: ['*'] }];
  }
}

/**
 * Export handler
 */
async function handleExport(
  _event: Electron.IpcMainInvokeEvent,
  messages: Message[],
  options: ExportOptions,
  title: string = 'Messages Export'
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    // Sort messages by timestamp
    const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);

    // Generate content
    let content: string;
    switch (options.format) {
      case 'text':
        content = exportAsText(sorted, options);
        break;
      case 'csv':
        content = exportAsCSV(sorted, options);
        break;
      case 'json':
        content = exportAsJSON(sorted, options);
        break;
      case 'html':
        content = exportAsHTML(sorted, options, title);
        break;
      default:
        throw new Error(`Unknown format: ${options.format}`);
    }

    // Show save dialog
    const window = BrowserWindow.getFocusedWindow();
    const defaultFileName = `messages-export-${Date.now()}.${getExtension(options.format)}`;

    const result = await dialog.showSaveDialog(window!, {
      title: 'Export Messages',
      defaultPath: defaultFileName,
      filters: getFileFilter(options.format),
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export cancelled' };
    }

    // Write file
    await fs.promises.writeFile(result.filePath, content, 'utf-8');

    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

/**
 * Register export handlers
 */
export function registerExportHandlers(): void {
  ipcMain.handle('export-messages', handleExport);
}

/**
 * Unregister export handlers
 */
export function unregisterExportHandlers(): void {
  ipcMain.removeHandler('export-messages');
}
