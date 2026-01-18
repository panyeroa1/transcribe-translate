/**
 * Complete language list from JW.org with regional dialects
 * Includes Dutch/Flemish, Cameroon, Ivory Coast, French, and Philippines dialects
 */

export interface Language {
    code: string;
    name: string;
    vernacularName: string;
    script: string;
    direction: 'ltr' | 'rtl';
    isSignLanguage: boolean;
}

export const LANGUAGES: Language[] = [
    // === MAJOR WORLD LANGUAGES ===
    { code: 'en-US', name: 'English (US)', vernacularName: 'English', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'en-GB', name: 'English (UK)', vernacularName: 'English (UK)', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'es-ES', name: 'Spanish (Spain)', vernacularName: 'Español', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'es-MX', name: 'Spanish (Mexico)', vernacularName: 'Español (México)', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'pt-BR', name: 'Portuguese (Brazil)', vernacularName: 'Português (Brasil)', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'pt-PT', name: 'Portuguese (Portugal)', vernacularName: 'Português', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'de-DE', name: 'German', vernacularName: 'Deutsch', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'it', name: 'Italian', vernacularName: 'Italiano', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ru', name: 'Russian', vernacularName: 'русский', script: 'CYRILLIC', direction: 'ltr', isSignLanguage: false },
    { code: 'ja-JP', name: 'Japanese', vernacularName: '日本語', script: 'JAPANESE', direction: 'ltr', isSignLanguage: false },
    { code: 'ko-KR', name: 'Korean', vernacularName: '한국어', script: 'KOREAN', direction: 'ltr', isSignLanguage: false },
    { code: 'zh-CN', name: 'Chinese (Simplified)', vernacularName: '中文简体', script: 'CHINESE', direction: 'ltr', isSignLanguage: false },
    { code: 'zh-TW', name: 'Chinese (Traditional)', vernacularName: '中文繁體', script: 'CHINESE', direction: 'ltr', isSignLanguage: false },
    { code: 'yue', name: 'Chinese Cantonese', vernacularName: '廣東話', script: 'CHINESE', direction: 'ltr', isSignLanguage: false },
    { code: 'ar', name: 'Arabic', vernacularName: 'العربية', script: 'ARABIC', direction: 'rtl', isSignLanguage: false },
    { code: 'hi', name: 'Hindi', vernacularName: 'हिन्दी', script: 'DEVANAGARI', direction: 'ltr', isSignLanguage: false },

    // === DUTCH & FLEMISH DIALECTS ===
    { code: 'nl', name: 'Dutch', vernacularName: 'Nederlands', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'nl-BE', name: 'Dutch (Belgium/Flemish)', vernacularName: 'Vlaams', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'nl-SR', name: 'Dutch (Suriname)', vernacularName: 'Nederlands (Suriname)', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'vls', name: 'Flemish (West)', vernacularName: 'West-Vlaams', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'li', name: 'Limburgish', vernacularName: 'Limburgs', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'fy', name: 'Frisian', vernacularName: 'Frysk', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'af', name: 'Afrikaans', vernacularName: 'Afrikaans', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },

    // === FRENCH DIALECTS & VARIANTS ===
    { code: 'fr-FR', name: 'French (France)', vernacularName: 'Français', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'fr-CA', name: 'French (Canada)', vernacularName: 'Français (Canada)', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'fr-BE', name: 'French (Belgium)', vernacularName: 'Français (Belgique)', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'fr-CH', name: 'French (Switzerland)', vernacularName: 'Français (Suisse)', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'fr-BJ', name: 'French (Benin)', vernacularName: 'Français (Bénin)', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'fr-SN', name: 'French (Senegal)', vernacularName: 'Français (Sénégal)', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'fr-CI', name: 'French (Ivory Coast)', vernacularName: "Français (Côte d'Ivoire)", script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'fr-CM', name: 'French (Cameroon)', vernacularName: 'Français (Cameroun)', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'fr-CD', name: 'French (Congo)', vernacularName: 'Français (Congo)', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'fr-HT', name: 'French (Haiti)', vernacularName: 'Français (Haïti)', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ht', name: 'Haitian Creole', vernacularName: 'Kreyòl ayisyen', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'gcf', name: 'Guadeloupean Creole', vernacularName: 'Kréyòl Gwadloup', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'gcr', name: 'Guianese Creole', vernacularName: 'Kréyòl gwiyanè', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'oc', name: 'Occitan', vernacularName: 'Occitan', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'br', name: 'Breton', vernacularName: 'Brezhoneg', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'co', name: 'Corsican', vernacularName: 'Corsu', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'gsw', name: 'Alsatian', vernacularName: 'Elsässisch', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },

    // === CAMEROON LANGUAGES ===
    { code: 'byv', name: 'Medumba', vernacularName: 'Mə̀dʉ̂mbὰ', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'bbj', name: "Ghomálá'", vernacularName: 'Bandjoun-Baham', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'fmp', name: "Fe'fe'", vernacularName: 'Bafang', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ybb', name: 'Yemba', vernacularName: 'Yemba', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'bum', name: 'Boulou', vernacularName: 'Bulu', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ewo', name: 'Ewondo', vernacularName: 'Ewondo', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'eto', name: 'Eton', vernacularName: 'Iton', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'bas', name: 'Bassa (Cameroon)', vernacularName: 'Basaa', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'dua', name: 'Douala', vernacularName: 'Douala', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'bax', name: 'Bamun', vernacularName: 'Shü Pamom', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ksf', name: 'Bafia', vernacularName: 'Rikpag', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'fub', name: 'Fulfulde (Cameroon)', vernacularName: 'Fulfulde', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'lmp', name: 'Limbum', vernacularName: 'Limbum', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'mcp', name: 'Makaa', vernacularName: 'Makaa', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'nnh', name: 'Ngiemboon', vernacularName: 'Ngiemboon', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },

    // === IVORY COAST (CÔTE D'IVOIRE) LANGUAGES ===
    { code: 'bci', name: 'Baoule', vernacularName: 'Wawle', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'btg', name: 'Bété', vernacularName: 'Bhɛtɩgbʋʋ', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'gxx', name: 'Guéré', vernacularName: 'wɛ', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'goa', name: 'Gouro', vernacularName: 'Goro', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ati', name: 'Attié', vernacularName: 'Akie', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'dyu', name: 'Jula', vernacularName: 'Jula', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'any', name: 'Anyin', vernacularName: 'Anyin', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'sef', name: 'Sénoufo (Cebaara)', vernacularName: 'Cebaara', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'dic', name: 'Dida (Lakota)', vernacularName: 'Dida', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'abi', name: 'Abbey', vernacularName: 'Abɛ', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },

    // === PHILIPPINES LANGUAGES & DIALECTS ===
    { code: 'tl-PH', name: 'Filipino (Tagalog)', vernacularName: 'Tagalog', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ceb', name: 'Cebuano', vernacularName: 'Cebuano', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ilo', name: 'Iloko', vernacularName: 'Iloko', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'hil', name: 'Hiligaynon', vernacularName: 'Hiligaynon', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'war', name: 'Waray', vernacularName: 'Winaray', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'pam', name: 'Pampanga', vernacularName: 'Kapampangan', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'bcl', name: 'Bicol', vernacularName: 'Bicol', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'pag', name: 'Pangasinan', vernacularName: 'Pangasinan', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ibg', name: 'Ibanag', vernacularName: 'Ibanag', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ivv', name: 'Ivatan', vernacularName: 'Ivatan', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'krj', name: 'Kinaray-a', vernacularName: 'Kinaray-a', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'kne', name: 'Kankanaey', vernacularName: 'Kankanaey', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'akl', name: 'Aklanon', vernacularName: 'Akeanon', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'cbk', name: 'Chavacano', vernacularName: 'Chavacano', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'sgd', name: 'Surigaonon', vernacularName: 'Surigaonon', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'mdh', name: 'Maguindanao', vernacularName: 'Maguindanao', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'mrw', name: 'Maranao', vernacularName: 'Maranao', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'tsg', name: 'Tausug', vernacularName: 'Tausug', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ibl', name: 'Ibaloi', vernacularName: 'Ibaloi', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'kyk', name: 'Kamayo', vernacularName: 'Kamayo', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },

    // === OTHER ASIAN LANGUAGES ===
    { code: 'vi', name: 'Vietnamese', vernacularName: 'Tiếng Việt', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'th', name: 'Thai', vernacularName: 'ไทย', script: 'THAI', direction: 'ltr', isSignLanguage: false },
    { code: 'id', name: 'Indonesian', vernacularName: 'Indonesia', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ms', name: 'Malay', vernacularName: 'Melayu', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'jv', name: 'Javanese', vernacularName: 'Jawa', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'su', name: 'Sundanese', vernacularName: 'Basa Sunda', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'km', name: 'Cambodian (Khmer)', vernacularName: 'ខ្មែរ', script: 'CAMBODIAN', direction: 'ltr', isSignLanguage: false },
    { code: 'lo', name: 'Laotian', vernacularName: 'ລາວ', script: 'LAOTIAN', direction: 'ltr', isSignLanguage: false },
    { code: 'my', name: 'Myanmar (Burmese)', vernacularName: 'မြန်မာ', script: 'MYANMAR', direction: 'ltr', isSignLanguage: false },

    // === SOUTH ASIAN LANGUAGES ===
    { code: 'bn', name: 'Bengali', vernacularName: 'বাংলা', script: 'BENGALI', direction: 'ltr', isSignLanguage: false },
    { code: 'ta', name: 'Tamil', vernacularName: 'தமிழ்', script: 'TAMIL', direction: 'ltr', isSignLanguage: false },
    { code: 'te', name: 'Telugu', vernacularName: 'తెలుగు', script: 'TELUGU', direction: 'ltr', isSignLanguage: false },
    { code: 'mr', name: 'Marathi', vernacularName: 'मराठी', script: 'DEVANAGARI', direction: 'ltr', isSignLanguage: false },
    { code: 'gu', name: 'Gujarati', vernacularName: 'ગુજરાતી', script: 'GUJARATI', direction: 'ltr', isSignLanguage: false },
    { code: 'kn', name: 'Kannada', vernacularName: 'ಕನ್ನಡ', script: 'KANNADA', direction: 'ltr', isSignLanguage: false },
    { code: 'ml', name: 'Malayalam', vernacularName: 'മലയാളം', script: 'MALAYALAM', direction: 'ltr', isSignLanguage: false },
    { code: 'pa', name: 'Punjabi', vernacularName: 'ਪੰਜਾਬੀ', script: 'GURMUKHI', direction: 'ltr', isSignLanguage: false },
    { code: 'ur', name: 'Urdu', vernacularName: 'اردو', script: 'ARABIC', direction: 'rtl', isSignLanguage: false },
    { code: 'si', name: 'Sinhala', vernacularName: 'සිංහල', script: 'SINHALA', direction: 'ltr', isSignLanguage: false },
    { code: 'ne', name: 'Nepali', vernacularName: 'नेपाली', script: 'DEVANAGARI', direction: 'ltr', isSignLanguage: false },

    // === OTHER EUROPEAN LANGUAGES ===
    { code: 'pl', name: 'Polish', vernacularName: 'polski', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'uk', name: 'Ukrainian', vernacularName: 'українська', script: 'CYRILLIC', direction: 'ltr', isSignLanguage: false },
    { code: 'el', name: 'Greek', vernacularName: 'Ελληνική', script: 'GREEK', direction: 'ltr', isSignLanguage: false },
    { code: 'cs', name: 'Czech', vernacularName: 'čeština', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'sv', name: 'Swedish', vernacularName: 'Svenska', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ro', name: 'Romanian', vernacularName: 'Română', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'hu', name: 'Hungarian', vernacularName: 'magyar', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'da', name: 'Danish', vernacularName: 'Dansk', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'fi', name: 'Finnish', vernacularName: 'suomi', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'no', name: 'Norwegian', vernacularName: 'Norsk', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'tr', name: 'Turkish', vernacularName: 'Türkçe', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'he', name: 'Hebrew', vernacularName: 'עברית', script: 'HEBREW', direction: 'rtl', isSignLanguage: false },
    { code: 'fa', name: 'Persian (Farsi)', vernacularName: 'فارسی', script: 'ARABIC', direction: 'rtl', isSignLanguage: false },

    // === AFRICAN LANGUAGES ===
    { code: 'sw', name: 'Swahili', vernacularName: 'Kiswahili', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'am', name: 'Amharic', vernacularName: 'አማርኛ', script: 'ETHIOPIC', direction: 'ltr', isSignLanguage: false },
    { code: 'zu', name: 'Zulu', vernacularName: 'isiZulu', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'xh', name: 'Xhosa', vernacularName: 'isiXhosa', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'yo', name: 'Yoruba', vernacularName: 'Yorùbá', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ig', name: 'Igbo', vernacularName: 'Igbo', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ha', name: 'Hausa', vernacularName: 'Hausa', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'rw', name: 'Kinyarwanda', vernacularName: 'Ikinyarwanda', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'mg', name: 'Malagasy', vernacularName: 'Malagasy', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'ln', name: 'Lingala', vernacularName: 'Lingala', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'kg', name: 'Kongo', vernacularName: 'Kikongo', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'wo', name: 'Wolof', vernacularName: 'Wolof', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'bm', name: 'Bambara', vernacularName: 'Bamanankan', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },

    // === PACIFIC LANGUAGES ===
    { code: 'fj', name: 'Fijian', vernacularName: 'vakaViti', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'sm', name: 'Samoan', vernacularName: 'Gagana Samoa', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'to', name: 'Tongan', vernacularName: 'lea faka-Tonga', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'mi', name: 'Maori', vernacularName: 'Te Reo Māori', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },
    { code: 'haw', name: 'Hawaiian', vernacularName: 'ʻŌlelo Hawaiʻi', script: 'ROMAN', direction: 'ltr', isSignLanguage: false },

    // === SIGN LANGUAGES ===
    { code: 'ase', name: 'American Sign Language', vernacularName: 'ASL', script: 'ROMAN', direction: 'ltr', isSignLanguage: true },
    { code: 'bfi', name: 'British Sign Language', vernacularName: 'BSL', script: 'ROMAN', direction: 'ltr', isSignLanguage: true },
    { code: 'fsl', name: 'French Sign Language', vernacularName: 'LSF', script: 'ROMAN', direction: 'ltr', isSignLanguage: true },
    { code: 'gsg', name: 'German Sign Language', vernacularName: 'DGS', script: 'ROMAN', direction: 'ltr', isSignLanguage: true },
    { code: 'jsl', name: 'Japanese Sign Language', vernacularName: '日本手話', script: 'JAPANESE', direction: 'ltr', isSignLanguage: true },
    { code: 'kvk', name: 'Korean Sign Language', vernacularName: '한국 수어', script: 'KOREAN', direction: 'ltr', isSignLanguage: true },
    { code: 'psp', name: 'Filipino Sign Language', vernacularName: 'FSL', script: 'ROMAN', direction: 'ltr', isSignLanguage: true },
    { code: 'vgt', name: 'Flemish Sign Language', vernacularName: 'VGT', script: 'ROMAN', direction: 'ltr', isSignLanguage: true },
    { code: 'dse', name: 'Dutch Sign Language', vernacularName: 'NGT', script: 'ROMAN', direction: 'ltr', isSignLanguage: true },
] as Language[];

// Simple lookup for dropdown display
export const LANGUAGE_OPTIONS = LANGUAGES.map(l => ({
    code: l.code,
    name: `${l.name} (${l.vernacularName})`
})).sort((a, b) => a.name.localeCompare(b.name));
