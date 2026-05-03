/**
 * Complete ASCII (0-127) constants with common aliases.
 * Provides character groups, maps, classification, and utility helpers.
 */

// ---------------------------------------------------------------------------
// Control Characters (0-31)
// ---------------------------------------------------------------------------
const NUL = 0; // \0 Null
const SOH = 1; // Start of Heading
const STX = 2; // Start of Text
const ETX = 3; // End of Text
const EOT = 4; // End of Transmission
const ENQ = 5; // Enquiry
const ACK = 6; // Acknowledge
const BEL = 7; // \a Bell
const BS = 8; // \b Backspace
const HT = 9; // \t Horizontal Tab
const TAB = HT; // alias
const LF = 10; // \n Line Feed / Newline
const NEWLINE = LF; // alias
const VT = 11; // \v Vertical Tab
const FF = 12; // \f Form Feed
const CR = 13; // \r Carriage Return
const SO = 14;
const SI = 15;
const DLE = 16;
const DC1 = 17; // XON
const DC2 = 18;
const DC3 = 19; // XOFF
const DC4 = 20;
const NAK = 21;
const SYN = 22;
const ETB = 23;
const CAN = 24;
const EM = 25;
const SUB = 26;
const ESC = 27;
const FS = 28;
const GS = 29;
const RS = 30;
const US = 31;

// ---------------------------------------------------------------------------
// Printable Characters (32-126)
// ---------------------------------------------------------------------------
const SPACE = 32; // ' '
const EXCLAMATION_MARK = 33; // !
const QUOTE = 34; // "
const QUOTATION_MARK = 34; // alias
const NUMBER_SIGN = 35; // #
const DOLLAR_SIGN = 36; // $
const PERCENT_SIGN = 37; // %
const AMPERSAND = 38; // &
const APOSTROPHE = 39; // '
const SINGLE_QUOTE = 39; // alias
const LEFT_PARENTHESIS = 40; // (
const RIGHT_PARENTHESIS = 41; // )
const ASTERISK = 42; // *
const PLUS_SIGN = 43; // +
const COMMA = 44; // ,
const HYPHEN = 45; // -
const HYPHEN_MINUS = 45; // alias
const MINUS = 45; // alias
const PERIOD = 46; // .
const FULL_STOP = 46; // alias
const DOT = 46; // alias
const SLASH = 47; // /
const SOLIDUS = 47; // alias

// Digits 0-9
const DIGIT_ZERO = 48;
const DIGIT_ONE = 49;
const DIGIT_TWO = 50;
const DIGIT_THREE = 51;
const DIGIT_FOUR = 52;
const DIGIT_FIVE = 53;
const DIGIT_SIX = 54;
const DIGIT_SEVEN = 55;
const DIGIT_EIGHT = 56;
const DIGIT_NINE = 57;

const COLON = 58; // :
const SEMICOLON = 59; // ;
const LESS_THAN = 60; // <
const EQUALS = 61; // =
const GREATER_THAN = 62; // >
const QUESTION_MARK = 63; // ?
const AT_SIGN = 64; // @

// Uppercase A-Z
const A = 65; const B = 66; const C = 67; const D = 68; const E = 69;
const F = 70; const G = 71; const H = 72; const I = 73; const J = 74;
const K = 75; const L = 76; const M = 77; const N = 78; const O = 79;
const P = 80; const Q = 81; const R = 82; const S = 83; const T = 84;
const U = 85; const V = 86; const W = 87; const X = 88; const Y = 89;
const Z = 90;

const LEFT_SQUARE_BRACKET = 91; // [
const BACKSLASH = 92; // \
const RIGHT_SQUARE_BRACKET = 93; // ]
const CARET = 94; // ^
const UNDERSCORE = 95; // _
const GRAVE_ACCENT = 96; // `

// Lowercase a-z
const a = 97; const b = 98; const c = 99; const d = 100; const e = 101;
const f = 102; const g = 103; const h = 104; const i = 105; const j = 106;
const k = 107; const l = 108; const m = 109; const n = 110; const o = 111;
const p = 112; const q = 113; const r = 114; const s = 115; const t = 116;
const u = 117; const v = 118; const w = 119; const x = 120; const y = 121;
const z = 122;

const LEFT_CURLY_BRACE = 123; // {
const LEFT_BRACE = 123; // alias
const VERTICAL_BAR = 124; // |
const PIPE = 124; // alias
const RIGHT_CURLY_BRACE = 125; // }
const RIGHT_BRACE = 125; // alias
const TILDE = 126; // ~

// Delete (127)
const DEL = 127;

// ---------------------------------------------------------------------------
// Character Groups
// ---------------------------------------------------------------------------
const CONTROL_CHARACTERS = Array.from({ length: 32 }, (_, i) => i); // 0..31
const WHITESPACE_CHARS = [SPACE, TAB, LF, VT, FF, CR];
const DIGITS = [
 DIGIT_ZERO, DIGIT_ONE, DIGIT_TWO, DIGIT_THREE, DIGIT_FOUR,
 DIGIT_FIVE, DIGIT_SIX, DIGIT_SEVEN, DIGIT_EIGHT, DIGIT_NINE
];

const UPPERCASE_LETTERS = [
 A, B, C, D, E, F, G, H, I, J, K, L, M,
 N, O, P, Q, R, S, T, U, V, W, X, Y, Z
];
const LOWERCASE_LETTERS = [
 a, b, c, d, e, f, g, h, i, j, k, l, m,
 n, o, p, q, r, s, t, u, v, w, x, y, z
];

const LETTERS = [...UPPERCASE_LETTERS, ...LOWERCASE_LETTERS];
const ALPHANUMERIC = [...LETTERS, ...DIGITS];

const PUNCTUATION_AND_SYMBOLS = [
 EXCLAMATION_MARK, QUOTE, NUMBER_SIGN, DOLLAR_SIGN, PERCENT_SIGN, AMPERSAND,
 APOSTROPHE, LEFT_PARENTHESIS, RIGHT_PARENTHESIS, ASTERISK, PLUS_SIGN, COMMA,
 HYPHEN, PERIOD, SLASH, COLON, SEMICOLON, LESS_THAN, EQUALS, GREATER_THAN,
 QUESTION_MARK, AT_SIGN, LEFT_SQUARE_BRACKET, BACKSLASH, RIGHT_SQUARE_BRACKET,
 CARET, UNDERSCORE, GRAVE_ACCENT, LEFT_CURLY_BRACE, VERTICAL_BAR,
 RIGHT_CURLY_BRACE, TILDE
];

const TOKEN_DELIMITERS = [...WHITESPACE_CHARS, ...PUNCTUATION_AND_SYMBOLS];

// ---------------------------------------------------------------------------
// Bidirectional Maps (Code <-> Name)
// ---------------------------------------------------------------------------

type CharCodeToNameMap = {
  [code: number]: string;
};

const CHAR_TO_NAME: CharCodeToNameMap = {
 0: 'NUL', 1: 'SOH', 2: 'STX', 3: 'ETX', 4: 'EOT', 5: 'ENQ', 6: 'ACK', 7: 'BEL',
 8: 'BS', 9: 'HT', 10: 'LF', 11: 'VT', 12: 'FF', 13: 'CR', 14: 'SO', 15: 'SI',
 16: 'DLE', 17: 'DC1', 18: 'DC2', 19: 'DC3', 20: 'DC4', 21: 'NAK', 22: 'SYN',
 23: 'ETB', 24: 'CAN', 25: 'EM', 26: 'SUB', 27: 'ESC', 28: 'FS', 29: 'GS',
 30: 'RS', 31: 'US',
 32: 'SPACE', 33: 'EXCLAMATION_MARK', 34: 'QUOTATION_MARK', 35: 'NUMBER_SIGN',
 36: 'DOLLAR_SIGN', 37: 'PERCENT_SIGN', 38: 'AMPERSAND', 39: 'APOSTROPHE',
 40: 'LEFT_PARENTHESIS', 41: 'RIGHT_PARENTHESIS', 42: 'ASTERISK', 43: 'PLUS_SIGN',
 44: 'COMMA', 45: 'HYPHEN', 46: 'PERIOD', 47: 'SLASH',
 48: 'DIGIT_ZERO', 49: 'DIGIT_ONE', 50: 'DIGIT_TWO', 51: 'DIGIT_THREE',
 52: 'DIGIT_FOUR', 53: 'DIGIT_FIVE', 54: 'DIGIT_SIX', 55: 'DIGIT_SEVEN',
 56: 'DIGIT_EIGHT', 57: 'DIGIT_NINE',
 58: 'COLON', 59: 'SEMICOLON', 60: 'LESS_THAN', 61: 'EQUALS', 62: 'GREATER_THAN',
 63: 'QUESTION_MARK', 64: 'AT_SIGN',
 65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E', 70: 'F', 71: 'G', 72: 'H',
 73: 'I', 74: 'J', 75: 'K', 76: 'L', 77: 'M', 78: 'N', 79: 'O', 80: 'P',
 81: 'Q', 82: 'R', 83: 'S', 84: 'T', 85: 'U', 86: 'V', 87: 'W', 88: 'X',
 89: 'Y', 90: 'Z',
 91: 'LEFT_SQUARE_BRACKET', 92: 'BACKSLASH', 93: 'RIGHT_SQUARE_BRACKET',
 94: 'CARET', 95: 'UNDERSCORE', 96: 'GRAVE_ACCENT',
 97: 'a', 98: 'b', 99: 'c', 100: 'd', 101: 'e', 102: 'f', 103: 'g', 104: 'h',
 105: 'i', 106: 'j', 107: 'k', 108: 'l', 109: 'm', 110: 'n', 111: 'o', 112: 'p',
 113: 'q', 114: 'r', 115: 's', 116: 't', 117: 'u', 118: 'v', 119: 'w', 120: 'x',
 121: 'y', 122: 'z',
 123: 'LEFT_CURLY_BRACE', 124: 'VERTICAL_BAR', 125: 'RIGHT_CURLY_BRACE',
 126: 'TILDE', 127: 'DEL'
};

const NAME_TO_CHAR = Object.fromEntries(
 Object.entries(CHAR_TO_NAME).map(([k, v]) => [v, Number(k)])
);

// ---------------------------------------------------------------------------
// Character Classification
// ---------------------------------------------------------------------------

/** True for control codes (0-31) and DEL (127). */
const isControl = (code: number) => (code >= 0 && code <= 31) || code === 127;

/** True for space, tab, LF, VT, FF, CR. */
const isWhitespace = (code: number) => WHITESPACE_CHARS.includes(code);

/** True for '0'-'9'. */
const isDigit = (code: number) => code >= DIGIT_ZERO && code <= DIGIT_NINE;

/** True for 'A'-'Z'. */
const isUppercase = (code: number) => code >= A && code <= Z;

/** True for 'a'-'z'. */
const isLowercase = (code: number) => code >= a && code <= z;

/** True for uppercase or lowercase letters. */
const isLetter = (code: number) => isUppercase(code) || isLowercase(code);

/** True for letters or digits. */
const isAlphanumeric = (code: number) => isLetter(code) || isDigit(code);

/** True for common punctuation and symbols (the `PUNCTUATION_AND_SYMBOLS` set). */
const isPunctuation = (code: number) => PUNCTUATION_AND_SYMBOLS.includes(code);

/** True for whitespace or punctuation. */
const isTokenDelimiter = (code: number) => TOKEN_DELIMITERS.includes(code);

/** True for printable ASCII (32-126). */
const isPrintable = (code: number) => code >= 32 && code <= 126;

// ---------------------------------------------------------------------------
// Lookup & Conversion
// ---------------------------------------------------------------------------

/** Get the constant name for an ASCII code, e.g. 65 → 'A'. */
const getCharName = (code: number) => CHAR_TO_NAME[code] || `UNKNOWN_${code}`;

/** Get the numeric code for a constant name, e.g. 'A' → 65. */
const getCharCode = (name: string) => NAME_TO_CHAR[name] ?? null;

/** Convert an ASCII code to a single-character string. */
const toChar = (code: number) => String.fromCharCode(code);

/** Convert a character to its ASCII code. */
const fromChar = (char: string) => char.charCodeAt(0);

// ---------------------------------------------------------------------------
// String Processing
// ---------------------------------------------------------------------------

const splitIntoTokens = (text: string) => {
 const tokens = [];
 let start = -1;

 for (let i = 0; i < text.length; i++) {
 const code = fromChar(text[i]);

 if (isTokenDelimiter(code)) {
 if (start !== -1) {
 tokens.push(text.slice(start, i));
 start = -1;
 }
 if (!isWhitespace(code)) tokens.push(text[i]);
 } else if (start === -1) {
 start = i;
 }
 }

 if (start !== -1) tokens.push(text.slice(start));
 return tokens;
};

/** Collapse all whitespace to a single space and trim. */
const normalizeWhitespace = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Remove all control characters (0-31, 127). */
const removeControlCharacters = (text: string) => text.replace(/[\x00-\x1F\x7F]/g, '');

/** Keep only letters and digits. */
const keepOnlyAlphanumeric = (text: string) => text.replace(/[^a-zA-Z0-9]/g, '');

/** Convert text to lowercase. */
const toLower = (text: string) => text.toLowerCase();

/** Convert text to uppercase. */
const toUpper = (text: string) => text.toUpperCase();

// ---------------------------------------------------------------------------
// Text Analysis
// ---------------------------------------------------------------------------

/** Return the category name for a given code. */
const getCharType = (code: number) => {
 if (isControl(code)) return 'CONTROL';
 if (isWhitespace(code)) return 'WHITESPACE';
 if (isDigit(code)) return 'DIGIT';
 if (isUppercase(code)) return 'UPPERCASE';
 if (isLowercase(code)) return 'LOWERCASE';
 if (isPunctuation(code)) return 'PUNCTUATION';
 return 'OTHER';
};

/** Compute basic statistics about a string. */
const analyzeText = (text: string) => {
 const stats = {
 totalChars: text.length,
 controlChars: 0,
 whitespace: 0,
 letters: 0,
 digits: 0,
 punctuation: 0,
 uniqueCount: 0
 };
 const unique = new Set();

 for (const char of text) {
 const code = fromChar(char);
 unique.add(char);

 if (isControl(code)) stats.controlChars++;
 else if (isWhitespace(code)) stats.whitespace++;
 else if (isLetter(code)) stats.letters++;
 else if (isDigit(code)) stats.digits++;
 else if (isPunctuation(code)) stats.punctuation++;
 }

 stats.uniqueCount = unique.size;
 return stats;
};

// ---------------------------------------------------------------------------
// Sentence Helpers
// ---------------------------------------------------------------------------

/**
 * Split text into sentences using . ! ? as delimiters.
 * Leading/trailing whitespace is trimmed and empty strings removed.
 */
const splitIntoSentences = (text: string) => {
 return text
 .replace(/([.!?])\s+/g, '$1|')
 .split('|')
 .map((s) => s.trim())
 .filter((s) => s.length > 0);
};

/** Check if a character code ends a sentence (period, exclamation, question mark). */
const isSentenceEnd = (code: number) =>
 code === PERIOD || code === EXCLAMATION_MARK || code === QUESTION_MARK;

// ---------------------------------------------------------------------------
// Byte & Misc
// ---------------------------------------------------------------------------

/** Get the UTF-8 byte length of a string (Node.js environment). */
const getByteLength = (text: string) => Buffer.byteLength(text, 'utf8');

// ---------------------------------------------------------------------------
// Module Exports
// ---------------------------------------------------------------------------
module.exports = {
 // Individual codes
 NUL, SOH, STX, ETX, EOT, ENQ, ACK, BEL, BS, HT, TAB, LF, NEWLINE, VT, FF, CR,
 SO, SI, DLE, DC1, DC2, DC3, DC4, NAK, SYN, ETB, CAN, EM, SUB, ESC, FS, GS, RS, US,

 SPACE, EXCLAMATION_MARK, QUOTE, QUOTATION_MARK, NUMBER_SIGN, DOLLAR_SIGN,
 PERCENT_SIGN, AMPERSAND, APOSTROPHE, SINGLE_QUOTE,
 LEFT_PARENTHESIS, RIGHT_PARENTHESIS, ASTERISK, PLUS_SIGN, COMMA,
 HYPHEN, HYPHEN_MINUS, MINUS, PERIOD, FULL_STOP, DOT, SLASH, SOLIDUS,

 DIGIT_ZERO, DIGIT_ONE, DIGIT_TWO, DIGIT_THREE, DIGIT_FOUR,
 DIGIT_FIVE, DIGIT_SIX, DIGIT_SEVEN, DIGIT_EIGHT, DIGIT_NINE,

 COLON, SEMICOLON, LESS_THAN, EQUALS, GREATER_THAN, QUESTION_MARK, AT_SIGN,

 A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z,
 a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z,

 LEFT_SQUARE_BRACKET, BACKSLASH, RIGHT_SQUARE_BRACKET, CARET, UNDERSCORE,
 GRAVE_ACCENT, LEFT_CURLY_BRACE, LEFT_BRACE, VERTICAL_BAR, PIPE,
 RIGHT_CURLY_BRACE, RIGHT_BRACE, TILDE,

 DEL,

 // Groups
 CONTROL_CHARACTERS, WHITESPACE_CHARS, DIGITS,
 UPPERCASE_LETTERS, LOWERCASE_LETTERS, LETTERS,
 ALPHANUMERIC, PUNCTUATION_AND_SYMBOLS, TOKEN_DELIMITERS,

 // Maps
 CHAR_TO_NAME, NAME_TO_CHAR,

 // Classification
 isControl, isWhitespace, isDigit, isUppercase, isLowercase,
 isLetter, isAlphanumeric, isPunctuation, isTokenDelimiter, isPrintable,

 // Lookup & Conversion
 getCharName, getCharCode, toChar, fromChar,

 // String Processing
 splitIntoTokens, normalizeWhitespace, removeControlCharacters,
 keepOnlyAlphanumeric, toLower, toUpper,

 // Analysis
 getCharType, analyzeText,

 // Sentence & Structure
 splitIntoSentences, isSentenceEnd,

 // Misc
 getByteLength
};
