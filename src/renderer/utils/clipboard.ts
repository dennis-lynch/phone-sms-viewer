/**
 * Clipboard Utilities
 *
 * Functions for copying messages to clipboard in various formats.
 */

import type { Message } from '../../shared/types';

/**
 * Format options for clipboard copy
 */
export interface CopyOptions {
  includeTimestamp: boolean;
  includeContactName: boolean;
  includeDirection: boolean;
}

const defaultCopyOptions: CopyOptions = {
  includeTimestamp: true,
  includeContactName: true,
  includeDirection: false,
};

/**
 * Format a single message for plain text copy
 * Format: [2024-07-24 10:33:56 PM] Contact Name: Message body
 */
export function formatMessageForCopy(message: Message, options: Partial<CopyOptions> = {}): string {
  const opts = { ...defaultCopyOptions, ...options };
  const parts: string[] = [];

  if (opts.includeTimestamp) {
    const date = new Date(message.timestamp);
    const dateStr = date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
    parts.push(`[${dateStr}]`);
  }

  if (opts.includeDirection) {
    parts.push(message.direction === 'sent' ? '→' : '←');
  }

  if (opts.includeContactName && message.contactName) {
    parts.push(`${message.contactName}:`);
  } else if (opts.includeDirection) {
    parts.push(message.direction === 'sent' ? 'Me:' : 'Them:');
  }

  parts.push(message.body);

  return parts.join(' ');
}

/**
 * Format multiple messages for plain text copy
 */
export function formatMessagesForCopy(
  messages: Message[],
  options: Partial<CopyOptions> = {}
): string {
  // Sort by timestamp ascending
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
  return sorted.map((msg) => formatMessageForCopy(msg, options)).join('\n');
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Copy a single message to clipboard
 */
export async function copyMessage(
  message: Message,
  options: Partial<CopyOptions> = {}
): Promise<boolean> {
  const text = formatMessageForCopy(message, options);
  return copyToClipboard(text);
}

/**
 * Copy multiple messages to clipboard
 */
export async function copyMessages(
  messages: Message[],
  options: Partial<CopyOptions> = {}
): Promise<boolean> {
  const text = formatMessagesForCopy(messages, options);
  return copyToClipboard(text);
}

/**
 * Copy message body only (no metadata)
 */
export async function copyMessageBody(message: Message): Promise<boolean> {
  return copyToClipboard(message.body);
}

/**
 * Copy multiple message bodies (no metadata)
 */
export async function copyMessageBodies(messages: Message[]): Promise<boolean> {
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
  const text = sorted.map((msg) => msg.body).join('\n\n');
  return copyToClipboard(text);
}
