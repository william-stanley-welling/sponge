#!/usr/bin/env node
// text2pix.ts - with placement, --output, and sidecar metadata
import { config } from '@dotenvx/dotenvx';
config();

const DEBUG = process.env.DEBUG === 'true';

import nlp from 'compromise';
import fs from 'fs';
import { PNG } from 'pngjs';
import zlib from 'zlib';

// ========== TIMING ==========
class Timer {
    private start: number;
    private label: string;
    constructor(label: string) {
        this.label = label;
        this.start = performance.now();
    }
    stop() {
        const elapsed = (performance.now() - this.start).toFixed(2);
        console.log(`[TIMER] ${this.label}: ${elapsed} ms`);
        return parseFloat(elapsed);
    }
}

// ========== DEBUG ==========
function debugLog(...args: any[]) {
    if (DEBUG) console.log('[DEBUG]', ...args);
}
function errorLog(...args: any[]) {
    console.error('[ERROR]', ...args);
}
function infoLog(...args: any[]) {
    console.log('[INFO]', ...args);
}

// ========== TYPES ==========
type PosCategory = 'Noun' | 'Verb' | 'Adjective' | 'Adverb' | 'Pronoun' | 'Preposition' | 'Conjunction' | 'Determiner' | 'Interjection' | 'QuestionWord' | 'Default';

interface TokenInfo {
    text: string;
    posTags: string[];
    rgba: [number, number, number, number];
}

interface WhitespaceRun {
    type: 'spaces' | 'tab' | 'newline';
    length: number;
    newlineType?: 'simple' | 'paragraph' | 'section';
}

interface LineContent {
    elements: (TokenInfo | WhitespaceRun)[];
}

interface Lens {
    name: string;
    audience: string;
    type: 'spectral' | 'temporal' | 'stylometric' | 'etymological' | 'structural';
    parameters: Record<string, any>;
}

interface Mask {
    name: string;
    audience: string;
    type: 'simplify' | 'summarize' | 'emphasize' | 'translate' | 'personalize';
    parameters: Record<string, any>;
}

type PlacementType = 'row_major' | 'strip' | 'hilbert';

interface PlacementConfig {
    type: PlacementType;
    parameters: {
        stripHeight?: number;
        sideLength?: number;
        stripsPerRow?: number;
    };
    originalWidth: number;
    originalHeight: number;
    streamLength: number;  // length of the pixel stream (before padding)
}

interface Metadata {
    version: string;
    width: number;
    height: number;
    placement: PlacementConfig;
    rgbaToToken: Record<string, string>;
    posAlphaMap: Record<PosCategory, number>;
    whitespaceConfig: {
        spaceBase: number;
        tabValue: number;
        newlineSimple: number;
        newlineParagraph: number;
        newlineSection: number;
    };
    reservedLineBreak: [number, number, number, number];  // special line‑break pixel
    lenses: Lens[];
    masks: Mask[];
}

// ========== POS TO ALPHA ==========
const defaultPosAlpha: Record<PosCategory, number> = {
    'Noun': 50,
    'Verb': 100,
    'Adjective': 150,
    'Adverb': 180,
    'Pronoun': 30,
    'Preposition': 200,
    'Conjunction': 220,
    'Determiner': 20,
    'Interjection': 240,
    'QuestionWord': 120,
    'Default': 128
};

function getPosCategory(tags: string[]): PosCategory {
    if (tags.includes('Noun')) return 'Noun';
    if (tags.includes('Verb')) return 'Verb';
    if (tags.includes('Adjective')) return 'Adjective';
    if (tags.includes('Adverb')) return 'Adverb';
    if (tags.includes('Pronoun')) return 'Pronoun';
    if (tags.includes('Preposition')) return 'Preposition';
    if (tags.includes('Conjunction')) return 'Conjunction';
    if (tags.includes('Determiner')) return 'Determiner';
    if (tags.includes('Interjection')) return 'Interjection';
    if (tags.includes('QuestionWord')) return 'QuestionWord';
    return 'Default';
}

// ========== UNIQUE RGB GENERATOR ==========
class UniqueColorGenerator {
    private tokenToColor: Map<string, [number, number, number]> = new Map();
    private usedColors: Set<string> = new Set();
    private isGrayscale(r: number, g: number, b: number): boolean {
        return r === g && g === b;
    }
    private hashToken(token: string, salt: number): [number, number, number] {
        let h = 0;
        for (let i = 0; i < token.length; i++) {
            h = ((h << 5) - h) + token.charCodeAt(i);
            h |= 0;
        }
        h ^= salt;
        return [(h & 0xFF), ((h >> 8) & 0xFF), ((h >> 16) & 0xFF)];
    }
    getColor(token: string): [number, number, number] {
        if (this.tokenToColor.has(token)) return this.tokenToColor.get(token)!;
        let salt = 0;
        let color: [number, number, number];
        do {
            color = this.hashToken(token, salt++);
            if (salt > 10000) salt = 0;
        } while (this.isGrayscale(color[0], color[1], color[2]) || this.usedColors.has(`${color[0]},${color[1]},${color[2]}`));
        this.tokenToColor.set(token, color);
        this.usedColors.add(`${color[0]},${color[1]},${color[2]}`);
        return color;
    }
}
const colorGen = new UniqueColorGenerator();

// ========== WHITESPACE ENCODING ==========
function whitespaceToPixel(run: WhitespaceRun, config: Metadata['whitespaceConfig']): [number, number, number, number] {
    let value: number;
    if (run.type === 'spaces') {
        value = Math.min(run.length - 1, 253);
    } else if (run.type === 'tab') {
        value = config.tabValue;
    } else {
        switch (run.newlineType) {
            case 'paragraph': value = config.newlineParagraph; break;
            case 'section': value = config.newlineSection; break;
            default: value = config.newlineSimple;
        }
    }
    return [value, value, value, 255];
}

// ========== PROCESS A LINE ==========
function processLine(line: string, lineIndex: number): LineContent {
    debugLog(`Processing line ${lineIndex}`);
    const elements: LineContent['elements'] = [];
    let i = 0;
    const len = line.length;
    let doc;
    try {
        doc = nlp(line);
    } catch (err) {
        errorLog(`NLP failed on line ${lineIndex}`, err);
        doc = { terms: () => ({ out: () => [] }) } as any;
    }
    const terms = doc.terms().out('array');
    let termIndex = 0;

    while (i < len) {
        const ch = line[i];
        if (/\s/.test(ch)) {
            const wsStart = i;
            while (i < len && /\s/.test(line[i])) i++;
            const wsRun = line.substring(wsStart, i);
            const firstChar = wsRun[0];
            if (firstChar === ' ') {
                elements.push({ type: 'spaces', length: wsRun.length } as WhitespaceRun);
            } else if (firstChar === '\t') {
                elements.push({ type: 'tab', length: wsRun.length } as WhitespaceRun);
            } else {
                elements.push({ type: 'spaces', length: wsRun.length } as WhitespaceRun);
                debugLog(`  Other whitespace (U+${firstChar.charCodeAt(0).toString(16)}) treated as spaces`);
            }
        } else {
            const tokenStart = i;
            while (i < len && !/\s/.test(line[i])) i++;
            const tokenText = line.substring(tokenStart, i);
            if (tokenText.length === 0) continue;

            let posTags: string[] = ['Default'];
            if (termIndex < terms.length) {
                const term = terms[termIndex];
                if (typeof term === 'object' && term.text === tokenText) {
                    posTags = term.tags as string[];
                } else {
                    const matched = terms.find((t: any) => t.text === tokenText);
                    if (matched) posTags = matched.tags;
                }
            }
            termIndex++;
            const category = getPosCategory(posTags);
            const rgb = colorGen.getColor(tokenText);
            const alpha = defaultPosAlpha[category];
            elements.push({
                text: tokenText,
                posTags,
                rgba: [rgb[0], rgb[1], rgb[2], alpha]
            } as TokenInfo);
            debugLog(`  Token: "${tokenText}" -> RGBA(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
        }
    }
    return { elements };
}

// ========== NEW: Remove redundant single-space runs between tokens ==========
function filterSingleSpacesBetweenTokens(elements: (TokenInfo | WhitespaceRun)[]): (TokenInfo | WhitespaceRun)[] {
    const filtered: (TokenInfo | WhitespaceRun)[] = [];
    for (let idx = 0; idx < elements.length; idx++) {
        const elem = elements[idx];
        if (
            'type' in elem &&
            elem.type === 'spaces' &&
            elem.length === 1 &&
            idx > 0 && idx < elements.length - 1 &&
            'rgba' in elements[idx - 1] &&
            'rgba' in elements[idx + 1]
        ) {
            continue; // skip single space between tokens
        }
        filtered.push(elem);
    }
    return filtered;
}

// ========== LENS APPLICATION (simplified) ==========
function applyLens(png: PNG, lens: Lens, rgbaToToken: Record<string, string>): any {
    infoLog(`Applying lens: ${lens.name} (${lens.type}) for ${lens.audience}`);
    const colors: { r: number; g: number; b: number; a: number }[] = [];
    for (let i = 0; i < png.data.length; i += 4) {
        colors.push({ r: png.data[i], g: png.data[i + 1], b: png.data[i + 2], a: png.data[i + 3] });
    }
    if (lens.type === 'spectral') {
        const clusters = lens.parameters.colorClusters || 5;
        const dominant = colors.slice(0, 100).reduce((acc, c) => {
            const key = `${Math.floor(c.r / 64)},${Math.floor(c.g / 64)},${Math.floor(c.b / 64)}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return { interpretation: `Spectral analysis: ${Object.keys(dominant).length} color clusters (target ${clusters})` };
    }
    if (lens.type === 'temporal') {
        let sumAlpha = 0, count = 0;
        for (const c of colors) if (c.a > 0) { sumAlpha += c.a; count++; }
        const avgAlpha = count ? sumAlpha / count : 0;
        return { interpretation: `Average opacity: ${(avgAlpha / 255 * 100).toFixed(1)}% (0=newest, 100=oldest)` };
    }
    if (lens.type === 'stylometric') {
        const nounPixelCount = colors.filter(c => c.r > 150 && c.g < 100 && c.b < 100).length;
        const ratio = nounPixelCount / colors.length;
        return { interpretation: ratio > 0.3 ? "Likely Shakespeare" : "Not Shakespeare" };
    }
    return null;
}

// ========== PLACEMENT TRANSFORMATIONS ==========
type RGBA = [number, number, number, number];

/**
 * Build a compact pixel stream from the (filtered) lines.
 * Each line is followed by a reserved line-break pixel.
 * The stream is then arranged row-major into a rectangle of width = maxLineLength.
 * Padded with transparent black at the end if needed.
 */
function packLinesToStreamGrid(
    lines: (TokenInfo | WhitespaceRun)[][],
    reservedPixel: RGBA,
    whitespaceConfig: Metadata['whitespaceConfig']
): { flatPixels: RGBA[]; streamLength: number; gridWidth: number; gridHeight: number } {
    const stream: RGBA[] = [];
    for (const line of lines) {
        for (const elem of line) {
            if ('rgba' in elem) {
                stream.push((elem as TokenInfo).rgba);
            } else {
                stream.push(whitespaceToPixel(elem as WhitespaceRun, whitespaceConfig));
            }
        }
        stream.push(reservedPixel); // line break
    }

    const streamLength = stream.length;

    // Determine grid width: maximum line length (number of element pixels, excl. break)
    let maxLineLen = 0;
    for (const line of lines) {
        maxLineLen = Math.max(maxLineLen, line.length);
    }
    // Add 1 to account for the line‑break pixel? No, because we place the break after each line's pixels,
    // so the grid width should be at least maxLineLen + 1 to fit a full line *including its break* in one row.
    // However, to keep rectangles compact, we use maxLineLen as the row width; lines longer than that would
    // wrap (but there are none, because maxLineLen is the maximum). The break pixel will then be placed at
    // index = line.length within the row. The row is exactly maxLineLen wide. After packing the stream,
    // if a line is shorter than maxLineLen, the break pixel appears at column < maxLineLen, and the rest
    // of the row is filled with the next line's pixels. This gives a fully packed grid.
    const gridWidth = maxLineLen; // no +1, we pack continuously
    const gridHeight = Math.ceil(streamLength / gridWidth);

    // Layout the stream row-major into a flat array of size gridWidth * gridHeight
    const flatPixels: RGBA[] = Array(gridWidth * gridHeight).fill([0, 0, 0, 0]); // transparent for padding
    for (let i = 0; i < streamLength; i++) {
        flatPixels[i] = stream[i];
    }

    return { flatPixels, streamLength, gridWidth, gridHeight };
}

function applyRowMajor(flatPixels: RGBA[], width: number, height: number): { width: number; height: number; pixels: RGBA[] } {
    return { width, height, pixels: flatPixels };
}

function applyStrip(flatPixels: RGBA[], stripHeight: number, originalWidth: number, originalHeight: number): { width: number; height: number; pixels: RGBA[] } {
    const totalPixels = originalWidth * originalHeight;
    const strips = Math.ceil(originalHeight / stripHeight);
    const newWidth = originalWidth * strips;
    const newHeight = stripHeight;
    const newPixels: RGBA[] = Array(newWidth * newHeight).fill([0, 0, 0, 0]);
    for (let stripIdx = 0; stripIdx < strips; stripIdx++) {
        const startRow = stripIdx * stripHeight;
        const endRow = Math.min(startRow + stripHeight, originalHeight);
        for (let y = startRow; y < endRow; y++) {
            const rowOffset = y * originalWidth;
            const targetXBase = stripIdx * originalWidth;
            const targetY = y - startRow;
            for (let x = 0; x < originalWidth; x++) {
                const srcIdx = rowOffset + x;
                if (srcIdx < totalPixels) {
                    const targetIdx = targetY * newWidth + targetXBase + x;
                    newPixels[targetIdx] = flatPixels[srcIdx];
                }
            }
        }
    }
    return { width: newWidth, height: newHeight, pixels: newPixels };
}

function hilbertIndexToXY(index: number, side: number): { x: number; y: number } {
    let x = 0, y = 0;
    let t = index;
    for (let s = 1; s < side; s <<= 1) {
        const rx = 1 & (t >> 1);
        const ry = 1 & (t ^ rx);
        if (ry === 0) {
            if (rx === 1) {
                x = s - 1 - x;
                y = s - 1 - y;
            }
            const tmp = x;
            x = y;
            y = tmp;
        }
        x += s * rx;
        y += s * ry;
        t >>= 2;
    }
    return { x, y };
}

function applyHilbert(flatPixels: RGBA[], sideLength: number): { width: number; height: number; pixels: RGBA[] } {
    const side = sideLength;
    const totalPixels = flatPixels.length;
    const newPixels: RGBA[] = Array(side * side).fill([0, 0, 0, 0]);
    for (let i = 0; i < totalPixels; i++) {
        const { x, y } = hilbertIndexToXY(i, side);
        const idx = y * side + x;
        newPixels[idx] = flatPixels[i];
    }
    return { width: side, height: side, pixels: newPixels };
}

function reversePlacement(pixels: RGBA[], placement: PlacementConfig): { width: number; height: number; pixels: RGBA[] } {
    const { type, parameters, originalWidth, originalHeight } = placement;
    if (type === 'row_major') {
        const expectedTotal = originalWidth * originalHeight;
        const flat = pixels.slice(0, expectedTotal);
        return { width: originalWidth, height: originalHeight, pixels: flat };
    }
    if (type === 'strip') {
        const stripHeight = parameters.stripHeight!;
        const strips = Math.ceil(originalHeight / stripHeight);
        const newWidth = originalWidth * strips;
        const newHeight = stripHeight;
        const flatPixels: RGBA[] = Array(originalWidth * originalHeight).fill([0, 0, 0, 0]);
        for (let stripIdx = 0; stripIdx < strips; stripIdx++) {
            const startRow = stripIdx * stripHeight;
            const endRow = Math.min(startRow + stripHeight, originalHeight);
            for (let y = startRow; y < endRow; y++) {
                const srcXBase = stripIdx * originalWidth;
                const srcY = y - startRow;
                for (let x = 0; x < originalWidth; x++) {
                    const srcIdx = srcY * newWidth + srcXBase + x;
                    if (srcIdx < pixels.length) {
                        const destIdx = y * originalWidth + x;
                        flatPixels[destIdx] = pixels[srcIdx];
                    }
                }
            }
        }
        return { width: originalWidth, height: originalHeight, pixels: flatPixels };
    }
    if (type === 'hilbert') {
        const side = parameters.sideLength!;
        const total = originalWidth * originalHeight;
        const flatPixels: RGBA[] = Array(total).fill([0, 0, 0, 0]);
        for (let i = 0; i < total; i++) {
            const { x, y } = hilbertIndexToXY(i, side);
            const srcIdx = y * side + x;
            if (srcIdx < pixels.length) {
                flatPixels[i] = pixels[srcIdx];
            }
        }
        return { width: originalWidth, height: originalHeight, pixels: flatPixels };
    }
    throw new Error(`Unknown placement type: ${type}`);
}

// ========== ENCODE ==========
async function encodeTextToPng(
    text: string,
    outputBase: string,
    placement: PlacementType = 'row_major',
    placementParams: { stripHeight?: number; sideLength?: number } = {},
    lenses?: Lens[],
    masks?: Mask[]
) {
    const totalTimer = new Timer('Total encoding');

    const rawLines = text.split(/\r?\n/);
    infoLog(`${rawLines.length} lines`);

    const linesContent: LineContent[] = [];
    const rgbaToToken: Record<string, string> = {};

    const processTimer = new Timer('Process lines');
    for (let lineIdx = 0; lineIdx < rawLines.length; lineIdx++) {
        const lineContent = processLine(rawLines[lineIdx], lineIdx);
        linesContent.push(lineContent);
        for (const elem of lineContent.elements) {
            if ('rgba' in elem) {
                const key = `${elem.rgba[0]},${elem.rgba[1]},${elem.rgba[2]},${elem.rgba[3]}`;
                if (rgbaToToken[key] && rgbaToToken[key] !== elem.text) {
                    console.warn(`[WARN] Collision: ${key} -> "${rgbaToToken[key]}" vs "${elem.text}"`);
                } else {
                    rgbaToToken[key] = elem.text;
                }
            }
        }
    }
    processTimer.stop();

    // Remove single spaces between tokens
    const filteredLines = linesContent.map(lc => filterSingleSpacesBetweenTokens(lc.elements));

    // Define the line‑break reserved pixel (bright green, fully opaque)
    const reservedLineBreak: RGBA = [0, 255, 0, 255];

    // Build the compact pixel stream and grid
    const whitespaceConfig = {
        spaceBase: 0,
        tabValue: 254,
        newlineSimple: 128,
        newlineParagraph: 160,
        newlineSection: 192
    };
    const { flatPixels: packedPixels, streamLength, gridWidth, gridHeight } =
        packLinesToStreamGrid(filteredLines, reservedLineBreak, whitespaceConfig);

    infoLog(`Packed grid dimensions: ${gridWidth} x ${gridHeight} (stream length = ${streamLength})`);

    let tiled: { width: number; height: number; pixels: RGBA[] };
    let placementConfig: PlacementConfig = {
        type: placement,
        parameters: {},
        originalWidth: gridWidth,
        originalHeight: gridHeight,
        streamLength: streamLength
    };

    switch (placement) {
        case 'row_major':
            tiled = applyRowMajor(packedPixels, gridWidth, gridHeight);
            break;
        case 'strip':
            const stripHeight = placementParams.stripHeight || 64;
            placementConfig.parameters.stripHeight = stripHeight;
            tiled = applyStrip(packedPixels, stripHeight, gridWidth, gridHeight);
            break;
        case 'hilbert':
            const totalPixels = packedPixels.length;
            let side = Math.ceil(Math.sqrt(totalPixels));
            side = Math.pow(2, Math.ceil(Math.log2(side)));
            placementConfig.parameters.sideLength = side;
            tiled = applyHilbert(packedPixels, side);
            break;
        default:
            throw new Error(`Unknown placement: ${placement}`);
    }
    infoLog(`Tiled dimensions: ${tiled.width} x ${tiled.height}`);

    const png = new PNG({ width: tiled.width, height: tiled.height, inputHasAlpha: true });
    for (let y = 0; y < tiled.height; y++) {
        for (let x = 0; x < tiled.width; x++) {
            const idx = (y * tiled.width + x) * 4;
            const rgba = tiled.pixels[y * tiled.width + x];
            png.data[idx] = rgba[0];
            png.data[idx + 1] = rgba[1];
            png.data[idx + 2] = rgba[2];
            png.data[idx + 3] = rgba[3];
        }
    }

    const pngPath = `${outputBase}.png`;
    await new Promise<void>((resolve, reject) => {
        const writeStream = fs.createWriteStream(pngPath);
        png.pack().pipe(writeStream);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
    });
    infoLog(`PNG saved: ${pngPath}`);

    const metadata: Metadata = {
        version: '3.0',
        width: tiled.width,
        height: tiled.height,
        placement: placementConfig,
        rgbaToToken,
        posAlphaMap: defaultPosAlpha,
        whitespaceConfig: {
            spaceBase: 0,
            tabValue: 254,
            newlineSimple: 128,
            newlineParagraph: 160,
            newlineSection: 192
        },
        reservedLineBreak: reservedLineBreak,
        lenses: lenses || [],
        masks: masks || []
    };
    const jsonRaw = JSON.stringify(metadata);
    const compressed = zlib.brotliCompressSync(jsonRaw);
    const jsonBrPath = `${outputBase}.json.br`;
    fs.writeFileSync(jsonBrPath, compressed);
    infoLog(`Metadata written (compressed): ${jsonBrPath} (${compressed.length} bytes)`);

    const jsonRawFormatted = JSON.stringify(metadata, null, 2);
    const jsonPath = `${outputBase}.json`;
    fs.writeFileSync(jsonPath, jsonRawFormatted);
    infoLog(`Metadata written (uncompressed): ${jsonPath} (${jsonRawFormatted.length} bytes)`);

    const originalSize = Buffer.from(text, 'utf-8').length;
    const pngSize = fs.statSync(pngPath).size;
    const totalSize = pngSize + compressed.length;
    infoLog(`\n=== Summary ===`);
    infoLog(`Original: ${originalSize} bytes`);
    infoLog(`PNG: ${pngSize} bytes`);
    infoLog(`Metadata: ${compressed.length} bytes`);
    infoLog(`Total: ${totalSize} bytes (${((totalSize / originalSize) * 100).toFixed(1)}% of original)`);
    infoLog(`Placement: ${placement}`);
    totalTimer.stop();
}

// ========== DECODE ==========
function decodePngToText(pngPath: string, lensName?: string): string | any {
    const totalTimer = new Timer('Total decoding');
    const baseName = pngPath.replace(/\.png$/, '');
    const jsonBrPath = `${baseName}.json.br`;
    const jsonPath = `${baseName}.json`;

    let metadata: Metadata;
    let rawJson: string;
    if (fs.existsSync(jsonBrPath)) {
        const compressed = fs.readFileSync(jsonBrPath);
        const decompressed = zlib.brotliDecompressSync(compressed);
        rawJson = decompressed.toString();
    } else if (fs.existsSync(jsonPath)) {
        rawJson = fs.readFileSync(jsonPath, 'utf-8');
    } else {
        throw new Error(`Metadata not found: tried ${jsonBrPath} and ${jsonPath}`);
    }
    metadata = JSON.parse(rawJson);

    const pngBuffer = fs.readFileSync(pngPath);
    const png = PNG.sync.read(pngBuffer);
    if (png.width !== metadata.width || png.height !== metadata.height) {
        console.warn(`PNG dimensions mismatch: ${png.width}x${png.height} vs metadata ${metadata.width}x${metadata.height}`);
    }

    if (lensName) {
        const lens = metadata.lenses.find(l => l.name === lensName);
        if (!lens) throw new Error(`Lens "${lensName}" not found in metadata`);
        const result = applyLens(png, lens, metadata.rgbaToToken);
        totalTimer.stop();
        return result;
    }

    // Extract tiled pixels
    const tiledPixels: RGBA[] = [];
    for (let i = 0; i < png.data.length; i += 4) {
        tiledPixels.push([png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]]);
    }

    // Reverse placement to get packed grid
    const reversed = reversePlacement(tiledPixels, metadata.placement);
    const packedPixels = reversed.pixels; // row-major order of the packed grid
    const gridWidth = metadata.placement.originalWidth;
    const gridHeight = metadata.placement.originalHeight;
    const streamLength = metadata.placement.streamLength;

    // Reconstruct the stream (ignore trailing transparent padding)
    const stream = packedPixels.slice(0, streamLength);

    const rgbaToToken = metadata.rgbaToToken;
    const lineBreak = metadata.reservedLineBreak;
    const isGrayscale = (r: number, g: number, b: number) => r === g && g === b;

    // Split stream into lines at the reserved pixel
    const lines: string[] = [];
    let currentLineParts: string[] = []; // accumulate text pieces
    let prevWasToken = false;

    for (let i = 0; i < stream.length; i++) {
        const [r, g, b, a] = stream[i];

        // Check for line‑break pixel
        if (r === lineBreak[0] && g === lineBreak[1] && b === lineBreak[2] && a === lineBreak[3]) {
            // End of line: push current line to lines
            lines.push(currentLineParts.join(''));
            currentLineParts = [];
            prevWasToken = false;
            continue;
        }

        if (isGrayscale(r, g, b)) {
            // Whitespace pixel
            prevWasToken = false;
            if (r === metadata.whitespaceConfig.tabValue) {
                currentLineParts.push('\t');
            } else if (
                r === metadata.whitespaceConfig.newlineSimple ||
                r === metadata.whitespaceConfig.newlineParagraph ||
                r === metadata.whitespaceConfig.newlineSection
            ) {
                // Newlines inside a line are not expected, but handle
                currentLineParts.push('\n');
            } else {
                currentLineParts.push(' '.repeat(r + 1));
            }
        } else {
            // Token pixel
            const key = `${r},${g},${b},${a}`;
            const token = rgbaToToken[key] || `?UNK(${key})?`;
            if (prevWasToken) {
                currentLineParts.push(' '); // implicit space between adjacent tokens
            }
            currentLineParts.push(token);
            prevWasToken = true;
        }
    }
    // If the stream didn't end with a line‑break, add remaining line
    if (currentLineParts.length > 0) {
        lines.push(currentLineParts.join(''));
    }

    const reconstructed = lines.join('\n');
    totalTimer.stop();
    return reconstructed;
}

// ========== CLI ==========
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage: text2pix.ts <file.txt | file.png> [options]');
        console.error('Options:');
        console.error('  --output <basename>                   Output base name (default: input file without extension)');
        console.error('  --placement <row_major|strip|hilbert> (default row_major)');
        console.error('  --strip-height <N>                    (for strip placement)');
        console.error('  --lens <name>                         (apply lens on decode)');
        console.error('  --lens-file <path.json>               (lenses to embed on encode)');
        process.exit(1);
    }

    const input = args[0];
    let outputBase: string | undefined;
    let placement: PlacementType = 'row_major';
    let stripHeight: number | undefined;
    let lensName: string | undefined;
    let lensFilePath: string | undefined;

    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--output') outputBase = args[++i];
        else if (args[i] === '--placement') placement = args[++i] as PlacementType;
        else if (args[i] === '--strip-height') stripHeight = parseInt(args[++i], 10);
        else if (args[i] === '--lens') lensName = args[++i];
        else if (args[i] === '--lens-file') lensFilePath = args[++i];
    }

    try {
        if (input.endsWith('.html')) {
            if (!fs.existsSync(input)) throw new Error(`File not found: ${input}`);
            const text = fs.readFileSync(input, 'utf-8');
            const base = outputBase ?? input.replace(/\.html$/, '');
            let lenses: Lens[] | undefined;
            if (lensFilePath) {
                if (!fs.existsSync(lensFilePath)) throw new Error(`Lens file not found: ${lensFilePath}`);
                lenses = JSON.parse(fs.readFileSync(lensFilePath, 'utf-8'));
            }
            await encodeTextToPng(text, base, placement, { stripHeight }, lenses);
        } else if (input.endsWith('.png')) {
            if (!fs.existsSync(input)) throw new Error(`File not found: ${input}`);
            const result = decodePngToText(input, lensName);
            if (lensName) {
                console.log(`\n🔍 Lens "${lensName}" result:\n`);
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log('\n📄 Original Text:\n');
                console.log(result);
            }
        } else {
            throw new Error('Unsupported file type. Use .txt or .png');
        }
    } catch (err) {
        errorLog('Fatal:', err);
        process.exit(1);
    }
}
main();
