
const fs = require('fs');
const https = require('https');

const SITEMAP_URL = 'https://www.jw.org/sitemap.xml';
const OUTPUT_FILE = 'languages.ts';

// Known language names mapping (partial) - in a real scenario we'd need a full ISO/JW name map.
// For now, we will use the existing LANGUAGES list to map known codes to names, 
// and for unknown codes, we will use the code itself as the name or a placeholder.
// Ideally we would fetch the HTML page of the language to get its name, but that's too heavy.
// We will try to preserve existing names and add new ones.

const fetchSitemap = () => {
    return new Promise((resolve, reject) => {
        https.get(SITEMAP_URL, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        });
    });
};

const parseLanguages = (xml) => {
    const regex = /<sitemap lang="([^"]+)">/g;
    const languages = [];
    let match;
    while ((match = regex.exec(xml)) !== null) {
        languages.push(match[1]);
    }
    return languages;
};

const generateFile = async () => {
    console.log('Fetching sitemap...');
    const xml = await fetchSitemap();
    console.log('Parsing languages...');
    const codes = parseLanguages(xml);
    console.log(`Found ${codes.length} languages.`);

    // Load existing languages to preserve names
    // We can't easily require the TS file, so we'll just read it and regex it or just overwrite with a best-effort approach.
    // Actually, let's just create a list.
    
    const uniqueCodes = [...new Set(codes)].sort();

    const tsContent = `export interface Language {
  code: string;
  name: string;
  vernacularName?: string;
  jwUrl: string;
}

export const LANGUAGES: Language[] = [
${uniqueCodes.map(code => {
    return `  {
    code: '${code}',
    name: '${code}', // Placeholder, manual update or lookup needed for 1000+ names
    jwUrl: 'https://www.jw.org/${code}'
  },`;
}).join('\n')}
];

export const LANGUAGE_OPTIONS = LANGUAGES.map(l => ({ code: l.code, name: l.name }));
`;

    fs.writeFileSync(OUTPUT_FILE, tsContent);
    console.log(`Wrote ${OUTPUT_FILE}`);
};

generateFile();
