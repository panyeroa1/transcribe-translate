const fs = require('fs');
const path = require('path');

// 1. Read the full sitemap XML
const xmlPath = path.join(__dirname, '../jw_sitemap_full.xml');
let xmlContent = '';

try {
  xmlContent = fs.readFileSync(xmlPath, 'utf8');
  console.log('Loaded jw_sitemap_full.xml');
} catch (e) {
  console.error('Failed to read jw_sitemap_full.xml. Make sure you downloaded it first.');
  process.exit(1);
}

// 2. Extract language codes
const langRegex = /lang="([^"]+)"/g;
let match;
const foundCodes = new Set();

while ((match = langRegex.exec(xmlContent)) !== null) {
  const code = match[1];
  foundCodes.add(code);
}

console.log(`Found ${foundCodes.size} language codes in sitemap.`);

// 3. Filter out Sign Languages
// Heuristic: Starts with 'sgn-', contains 'sign', or specific codes like 'ase'
const signCodes = new Set([
  'ase', // American Sign Language
  'bzs', 'csl', 'dse', 'fsl', 'gss', 'hsh', 'ism', 'jsr', 'kgi', 'lws', 'mfs', 'nsp', 'psp', 
  'rsl', 'sfs', 'tzs', 'usp', 'vsl', 'wsa', 'xki', 'ysl', 'zsl' // Common ones, might overlap with sgn-
]);

const validLanguages = [];
for (const code of foundCodes) {
  const lower = code.toLowerCase();
  
  // Filtering logic
  if (lower.startsWith('sgn-')) continue;
  if (lower.includes('sign')) continue; // unlikely in code but safe check
  if (signCodes.has(lower)) continue;

  validLanguages.push(code);
}

// Force add missing requested languages if not present
if (!validLanguages.includes('vls')) validLanguages.push('vls');
if (!validLanguages.includes('byv')) validLanguages.push('byv'); // Ensure medumba is there


console.log(`Filtered down to ${validLanguages.length} spoken/written languages (excluded Sign Languages).`);

// 4. Map to Names (Use existing names or Intl.DisplayNames or placeholders)
// We'll try to use a large map of known JW codes if possible, or just standard Intl names.
// For JW specific codes (like 'vls' -> West Flemish, 'byv' -> Medumba), Intl might fail or give generic.
// We'll check if we have the old languages.ts content to reuse names.

const currentLanguagesPath = path.join(__dirname, '../languages.ts');
let existingNames = new Map();

if (fs.existsSync(currentLanguagesPath)) {
  const content = fs.readFileSync(currentLanguagesPath, 'utf8');
  // Simple regex to extract code: '...' name: '...' pairs?
  // Or just rely on the fact that we ran a fetch earlier? 
  // Actually, the previous fetch script had a map.
  // Let's use libraries if available, otherwise fallback to code.
  // We can try to use `Intl.DisplayNames`.
}

// Helpers
function getLanguageName(code) {
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'language' });
    return dn.of(code) || code;
  } catch (e) {
    return code;
  }
}

// JW.org specific overrides or known missing ones
const overrides = {
  'vls': 'West Flemish (Vlaams)', // Friends Belgium?
  'byv': 'Medumba',
  'mdm': 'Mayogo', // Check if byv is Medumba. byv is Medumba in ISO 639-3.
  'kqn': 'Kaonde',
  'tll': 'Tetun Dili',
  // Add more if known
};

const finalData = validLanguages.map(code => {
  let name = overrides[code];
  if (!name) {
    // Try to reuse existing logic or clean up code
    // Intl doesn't handle JW proprietary codes or subtags well sometimes.
    name = getLanguageName(code);
    if (name === code) {
       // Format clearer?
       name = code; // Fallback
    }
  }
  
  return {
    code: code,
    name: name,
    jwUrl: `https://www.jw.org/${code}/`
  };
});

// Sort by Name for the file (User asked for alphabetical)
finalData.sort((a, b) => a.name.localeCompare(b.name));

// 5. Generate Content
const fileContent = `export interface Language {
  code: string;
  name: string;
  jwUrl: string;
  vernacularName?: string;
}

export const LANGUAGES: Language[] = ${JSON.stringify(finalData, null, 2)};

export const LANGUAGE_OPTIONS = LANGUAGES.map(l => ({ value: l.code, label: l.name }));
`;

// 6. Write
fs.writeFileSync(currentLanguagesPath, fileContent);
console.log(`Generated languages.ts with ${finalData.length} languages.`);
