/**
 * ZIP Extractor
 *
 * Extracts XML files from ZIP archives created by SMS Backup & Restore Pro.
 * Supports extracting to memory or temporary files for processing.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import AdmZip from 'adm-zip';
import type { BackupFileInfo } from '../../shared/types';

/**
 * Detected backup type based on filename or content
 */
export type BackupType = 'sms' | 'calls' | 'unknown';

/**
 * Information about a file inside a ZIP archive
 */
export interface ZipEntryInfo {
  name: string;
  size: number;
  compressedSize: number;
  type: BackupType;
}

/**
 * Result of extracting a file from a ZIP archive
 */
export interface ExtractResult {
  success: boolean;
  filePath: string;
  originalName: string;
  type: BackupType;
  error?: string;
}

/**
 * Detects the backup type from a filename
 */
export function detectBackupType(filename: string): BackupType {
  const lower = filename.toLowerCase();

  if (lower.includes('sms') || lower.includes('message')) {
    return 'sms';
  }

  if (lower.includes('call')) {
    return 'calls';
  }

  // Check file extension patterns
  if (lower.match(/sms-\d+\.xml$/)) {
    return 'sms';
  }

  if (lower.match(/calls-\d+.*\.xml$/)) {
    return 'calls';
  }

  return 'unknown';
}

/**
 * Detects backup type by reading the first few bytes of content
 */
export function detectBackupTypeFromContent(content: string): BackupType {
  // Look for root element indicators
  if (content.includes('<smses') || content.includes('<sms ')) {
    return 'sms';
  }

  if (content.includes('<calls') || content.includes('<call ')) {
    return 'calls';
  }

  return 'unknown';
}

/**
 * Lists all XML files in a ZIP archive
 */
export function listZipContents(zipPath: string): ZipEntryInfo[] {
  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    return entries
      .filter((entry) => !entry.isDirectory && entry.entryName.toLowerCase().endsWith('.xml'))
      .map((entry) => ({
        name: entry.entryName,
        size: entry.header.size,
        compressedSize: entry.header.compressedSize,
        type: detectBackupType(entry.entryName),
      }));
  } catch (error) {
    console.error('Failed to read ZIP file:', error);
    return [];
  }
}

/**
 * Extracts an XML file from a ZIP archive to a temporary location
 */
export function extractToTemp(zipPath: string, entryName?: string): ExtractResult {
  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    // Find the target entry
    let targetEntry = entries.find(
      (e) => !e.isDirectory && e.entryName.toLowerCase().endsWith('.xml')
    );

    if (entryName) {
      targetEntry = entries.find((e) => e.entryName === entryName);
    }

    if (!targetEntry) {
      return {
        success: false,
        filePath: '',
        originalName: '',
        type: 'unknown',
        error: 'No XML file found in archive',
      };
    }

    // Create temp directory
    const tempDir = path.join(os.tmpdir(), 'sms-viewer');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate unique temp filename
    const tempFileName = `${Date.now()}-${path.basename(targetEntry.entryName)}`;
    const tempPath = path.join(tempDir, tempFileName);

    // Extract to temp file
    zip.extractEntryTo(targetEntry, tempDir, false, true, false, tempFileName);

    const type = detectBackupType(targetEntry.entryName);

    return {
      success: true,
      filePath: tempPath,
      originalName: targetEntry.entryName,
      type,
    };
  } catch (error) {
    return {
      success: false,
      filePath: '',
      originalName: '',
      type: 'unknown',
      error: `Failed to extract: ${error}`,
    };
  }
}

/**
 * Extracts an XML file from a ZIP archive to memory (Buffer)
 * Use for smaller files to avoid disk I/O
 */
export function extractToBuffer(zipPath: string, entryName?: string): {
  success: boolean;
  buffer: Buffer | null;
  originalName: string;
  type: BackupType;
  error?: string;
} {
  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    // Find the target entry
    let targetEntry = entries.find(
      (e) => !e.isDirectory && e.entryName.toLowerCase().endsWith('.xml')
    );

    if (entryName) {
      targetEntry = entries.find((e) => e.entryName === entryName);
    }

    if (!targetEntry) {
      return {
        success: false,
        buffer: null,
        originalName: '',
        type: 'unknown',
        error: 'No XML file found in archive',
      };
    }

    const buffer = targetEntry.getData();
    const type = detectBackupType(targetEntry.entryName);

    // If type is unknown, try to detect from content
    let finalType = type;
    if (type === 'unknown') {
      const contentPreview = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
      finalType = detectBackupTypeFromContent(contentPreview);
    }

    return {
      success: true,
      buffer,
      originalName: targetEntry.entryName,
      type: finalType,
    };
  } catch (error) {
    return {
      success: false,
      buffer: null,
      originalName: '',
      type: 'unknown',
      error: `Failed to extract: ${error}`,
    };
  }
}

/**
 * Gets information about a backup file (ZIP or XML)
 */
export function getBackupFileInfo(filePath: string): BackupFileInfo | null {
  try {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.zip') {
      const contents = listZipContents(filePath);
      if (contents.length === 0) {
        return null;
      }

      // Use first XML file's info
      const firstXml = contents[0];
      return {
        filePath,
        fileName,
        type: firstXml.type,
        count: 0, // Will be determined when parsing
        backupSet: '',
        backupDate: 0,
        size: stats.size,
      };
    } else if (ext === '.xml') {
      // Read first part of XML to get info
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(4096);
      fs.readSync(fd, buffer, 0, 4096, 0);
      fs.closeSync(fd);

      const content = buffer.toString('utf8');
      const type = detectBackupTypeFromContent(content);

      // Try to extract count and backup_set from root element
      let count = 0;
      let backupSet = '';
      let backupDate = 0;

      const countMatch = content.match(/count="(\d+)"/);
      if (countMatch) {
        count = parseInt(countMatch[1], 10);
      }

      const backupSetMatch = content.match(/backup_set="([^"]+)"/);
      if (backupSetMatch) {
        backupSet = backupSetMatch[1];
      }

      const backupDateMatch = content.match(/backup_date="(\d+)"/);
      if (backupDateMatch) {
        backupDate = parseInt(backupDateMatch[1], 10);
      }

      return {
        filePath,
        fileName,
        type,
        count,
        backupSet,
        backupDate,
        size: stats.size,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to get backup file info:', error);
    return null;
  }
}

/**
 * Cleans up temporary files created during extraction
 */
export function cleanupTempFiles(): void {
  const tempDir = path.join(os.tmpdir(), 'sms-viewer');

  try {
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup temp files:', error);
  }
}

/**
 * Scans a directory for backup files (ZIP and XML)
 */
export function scanDirectoryForBackups(dirPath: string): BackupFileInfo[] {
  const backups: BackupFileInfo[] = [];

  try {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.xml' || ext === '.zip') {
          const info = getBackupFileInfo(filePath);
          if (info) {
            backups.push(info);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to scan directory:', error);
  }

  return backups;
}
