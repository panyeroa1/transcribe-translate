const fs = require('fs');

const voices = JSON.parse(fs.readFileSync('all_cartesia_voices.json', 'utf8'));
const langFile = fs.readFileSync('languages.ts', 'utf8');

const codeRegex = /code:\s*'([^']+)'/g;
const languages = [];
let match;
while ((match = codeRegex.exec(langFile)) !== null) {
  languages.push(match[1]);
}

const voicesByLang = {};

voices.forEach(v => {
  const lang = v.language; 
  if (!voicesByLang[lang]) voicesByLang[lang] = { male: [], female: [] };
  
  const gender = v.gender === 'masculine' ? 'male' : 'female';
  voicesByLang[lang][gender].push(v);
});

const DEFAULT_MALE = '79f8b5fb-2cc8-479a-80df-29f7a7cf1a3e'; 
const DEFAULT_FEMALE = '21cd39e9-d975-430c-99d6-5a7a7bb62f6b';

console.log('const CARTESIA_VOICES: Record<string, { male: string; female: string }> = {');

console.log(`  'default': { male: '${DEFAULT_MALE}', female: '${DEFAULT_FEMALE}' },`);

const mapped = new Set();

languages.forEach(code => {
  let targetLang = code;
  let candidates = voicesByLang[targetLang];
  
  if (!candidates) {
    targetLang = code.split('-')[0];
    candidates = voicesByLang[targetLang];
  }

  if (candidates && (candidates.male.length > 0 || candidates.female.length > 0)) {
    const maleVoice = candidates.male[0] ? candidates.male[0].id : DEFAULT_MALE;
    const femaleVoice = candidates.female[0] ? candidates.female[0].id : DEFAULT_FEMALE;
    
    // Escape names for comments
    const mName = (candidates.male[0] ? candidates.male[0].name : 'Default').replace(/'/g, "");
    const fName = (candidates.female[0] ? candidates.female[0].name : 'Default').replace(/'/g, "");
    
    console.log(`  '${code}': { male: '${maleVoice}', female: '${femaleVoice}' }, // ${mName} / ${fName}`);
    mapped.add(code);
  } else {
      // If absolutely no match, mapping to default but explicitly listing it is useful so the user sees we covered it
      console.log(`  '${code}': { male: '${DEFAULT_MALE}', female: '${DEFAULT_FEMALE}' }, // Universal Fallback`);
  }
});

console.log('};');
