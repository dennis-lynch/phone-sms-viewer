/**
 * HTML Entity Decoder
 *
 * Decodes HTML entities in message bodies from SMS Backup & Restore Pro XML.
 * Handles both named entities (&amp;, &lt;, etc.) and numeric entities (&#10;, &#128514;, etc.)
 */

// Common named HTML entities
const namedEntities: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
  '&copy;': '\u00A9',
  '&reg;': '\u00AE',
  '&trade;': '\u2122',
  '&ndash;': '\u2013',
  '&mdash;': '\u2014',
  '&lsquo;': '\u2018',
  '&rsquo;': '\u2019',
  '&ldquo;': '\u201C',
  '&rdquo;': '\u201D',
  '&hellip;': '\u2026',
  '&bull;': '\u2022',
  '&euro;': '\u20AC',
  '&pound;': '\u00A3',
  '&yen;': '\u00A5',
  '&cent;': '\u00A2',
  '&deg;': '\u00B0',
  '&plusmn;': '\u00B1',
  '&times;': '\u00D7',
  '&divide;': '\u00F7',
  '&frac12;': '\u00BD',
  '&frac14;': '\u00BC',
  '&frac34;': '\u00BE',
};

/**
 * Decodes a single numeric HTML entity (decimal or hexadecimal)
 *
 * @param match - The full entity match (e.g., "&#128514;" or "&#x1F602;")
 * @param numericPart - The numeric portion (e.g., "128514" or "x1F602")
 * @returns The decoded character
 */
function decodeNumericEntity(match: string, numericPart: string): string {
  try {
    let codePoint: number;

    if (numericPart.toLowerCase().startsWith('x')) {
      // Hexadecimal entity: &#xNNNN;
      codePoint = parseInt(numericPart.slice(1), 16);
    } else {
      // Decimal entity: &#NNNN;
      codePoint = parseInt(numericPart, 10);
    }

    if (isNaN(codePoint) || codePoint < 0) {
      return match; // Return original if invalid
    }

    // Convert code point to character
    return String.fromCodePoint(codePoint);
  } catch {
    // Return original if conversion fails (e.g., invalid code point)
    return match;
  }
}

/**
 * Decodes all HTML entities in a string
 *
 * @param text - Text containing HTML entities
 * @returns Decoded text
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) {
    return '';
  }

  let result = text;

  // Decode named entities
  for (const [entity, char] of Object.entries(namedEntities)) {
    result = result.split(entity).join(char);
  }

  // Decode numeric entities (decimal and hexadecimal)
  // Pattern matches: &#123; or &#x1F602; (with or without trailing semicolon for robustness)
  result = result.replace(/&#(x?[0-9a-fA-F]+);?/g, (match, numericPart) => {
    return decodeNumericEntity(match, numericPart);
  });

  return result;
}

/**
 * Encodes special characters as HTML entities for safe display
 *
 * @param text - Plain text
 * @returns Text with HTML special characters encoded
 */
export function encodeHtmlEntities(text: string): string {
  if (!text) {
    return '';
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Normalizes whitespace in decoded text
 * Converts multiple spaces/newlines to single ones
 *
 * @param text - Text with potentially excessive whitespace
 * @returns Text with normalized whitespace
 */
export function normalizeWhitespace(text: string): string {
  if (!text) {
    return '';
  }

  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ') // Collapse horizontal whitespace
    .trim();
}

/**
 * Fully processes message body text from XML
 * Decodes HTML entities and normalizes whitespace
 *
 * @param text - Raw text from XML
 * @returns Cleaned and decoded text
 */
export function processMessageBody(text: string): string {
  if (!text) {
    return '';
  }

  const decoded = decodeHtmlEntities(text);
  return decoded.trim();
}
