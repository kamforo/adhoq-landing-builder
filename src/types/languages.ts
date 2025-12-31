// Language and Country types for multi-language LP generation

/**
 * Supported languages
 */
export type LanguageCode =
  | 'en'      // English
  | 'de'      // German
  | 'fr'      // French
  | 'es'      // Spanish
  | 'pt'      // Portuguese
  | 'pt-BR'   // Portuguese (Brazil)
  | 'it'      // Italian
  | 'nl'      // Dutch
  | 'ja'      // Japanese
  | 'ko'      // Korean
  | 'pl'      // Polish
  | 'sv'      // Swedish
  | 'no'      // Norwegian
  | 'da'      // Danish
  | 'fi'      // Finnish
  | 'cs'      // Czech
  | 'sk'      // Slovak
  | 'hu'      // Hungarian
  | 'ro'      // Romanian
  | 'el'      // Greek
  | 'lt'      // Lithuanian
  | 'et'      // Estonian
  | 'sl'      // Slovenian
  | 'hr'      // Croatian
  | 'uk'      // Ukrainian
  | 'he';     // Hebrew

/**
 * Supported country codes (ISO 3166-1 alpha-2)
 */
export type CountryCode =
  | 'US' | 'GB' | 'AU' | 'NZ' | 'CA' | 'ZA' | 'IE'  // English
  | 'DE' | 'AT' | 'CH' | 'BE' | 'LU'                 // German
  | 'FR'                                              // French
  | 'ES' | 'CL' | 'MX' | 'AR'                        // Spanish
  | 'PT'                                              // Portuguese
  | 'BR'                                              // Portuguese (Brazil)
  | 'IT'                                              // Italian
  | 'NL'                                              // Dutch
  | 'JP'                                              // Japanese
  | 'KR'                                              // Korean
  | 'PL'                                              // Polish
  | 'SE'                                              // Swedish
  | 'NO'                                              // Norwegian
  | 'DK'                                              // Danish
  | 'FI'                                              // Finnish
  | 'CZ'                                              // Czech
  | 'SK'                                              // Slovak
  | 'HU'                                              // Hungarian
  | 'RO'                                              // Romanian
  | 'GR' | 'CY'                                       // Greek
  | 'LT'                                              // Lithuanian
  | 'EE'                                              // Estonian
  | 'SI'                                              // Slovenian
  | 'HR'                                              // Croatian
  | 'UA'                                              // Ukrainian
  | 'IL';                                             // Hebrew

/**
 * Language configuration
 */
export interface LanguageConfig {
  code: LanguageCode;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  countries: CountryCode[];
}

/**
 * Country configuration
 */
export interface CountryConfig {
  code: CountryCode;
  name: string;
  language: LanguageCode;
  flag: string;  // Emoji flag
}

/**
 * All supported languages with their configuration
 */
export const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  'en': {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    countries: ['US', 'GB', 'AU', 'NZ', 'CA', 'ZA', 'IE'],
  },
  'de': {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    countries: ['DE', 'AT', 'CH', 'LU'],
  },
  'fr': {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    countries: ['FR', 'BE', 'CH', 'CA', 'LU'],
  },
  'es': {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    countries: ['ES', 'CL', 'MX', 'AR'],
  },
  'pt': {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    countries: ['PT'],
  },
  'pt-BR': {
    code: 'pt-BR',
    name: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
    direction: 'ltr',
    countries: ['BR'],
  },
  'it': {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    direction: 'ltr',
    countries: ['IT', 'CH'],
  },
  'nl': {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    direction: 'ltr',
    countries: ['NL', 'BE'],
  },
  'ja': {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    countries: ['JP'],
  },
  'ko': {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    direction: 'ltr',
    countries: ['KR'],
  },
  'pl': {
    code: 'pl',
    name: 'Polish',
    nativeName: 'Polski',
    direction: 'ltr',
    countries: ['PL'],
  },
  'sv': {
    code: 'sv',
    name: 'Swedish',
    nativeName: 'Svenska',
    direction: 'ltr',
    countries: ['SE'],
  },
  'no': {
    code: 'no',
    name: 'Norwegian',
    nativeName: 'Norsk',
    direction: 'ltr',
    countries: ['NO'],
  },
  'da': {
    code: 'da',
    name: 'Danish',
    nativeName: 'Dansk',
    direction: 'ltr',
    countries: ['DK'],
  },
  'fi': {
    code: 'fi',
    name: 'Finnish',
    nativeName: 'Suomi',
    direction: 'ltr',
    countries: ['FI'],
  },
  'cs': {
    code: 'cs',
    name: 'Czech',
    nativeName: 'Čeština',
    direction: 'ltr',
    countries: ['CZ'],
  },
  'sk': {
    code: 'sk',
    name: 'Slovak',
    nativeName: 'Slovenčina',
    direction: 'ltr',
    countries: ['SK'],
  },
  'hu': {
    code: 'hu',
    name: 'Hungarian',
    nativeName: 'Magyar',
    direction: 'ltr',
    countries: ['HU'],
  },
  'ro': {
    code: 'ro',
    name: 'Romanian',
    nativeName: 'Română',
    direction: 'ltr',
    countries: ['RO'],
  },
  'el': {
    code: 'el',
    name: 'Greek',
    nativeName: 'Ελληνικά',
    direction: 'ltr',
    countries: ['GR', 'CY'],
  },
  'lt': {
    code: 'lt',
    name: 'Lithuanian',
    nativeName: 'Lietuvių',
    direction: 'ltr',
    countries: ['LT'],
  },
  'et': {
    code: 'et',
    name: 'Estonian',
    nativeName: 'Eesti',
    direction: 'ltr',
    countries: ['EE'],
  },
  'sl': {
    code: 'sl',
    name: 'Slovenian',
    nativeName: 'Slovenščina',
    direction: 'ltr',
    countries: ['SI'],
  },
  'hr': {
    code: 'hr',
    name: 'Croatian',
    nativeName: 'Hrvatski',
    direction: 'ltr',
    countries: ['HR'],
  },
  'uk': {
    code: 'uk',
    name: 'Ukrainian',
    nativeName: 'Українська',
    direction: 'ltr',
    countries: ['UA'],
  },
  'he': {
    code: 'he',
    name: 'Hebrew',
    nativeName: 'עברית',
    direction: 'rtl',
    countries: ['IL'],
  },
};

/**
 * All supported countries with their configuration
 */
export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  // English-speaking
  'US': { code: 'US', name: 'United States', language: 'en', flag: '🇺🇸' },
  'GB': { code: 'GB', name: 'United Kingdom', language: 'en', flag: '🇬🇧' },
  'AU': { code: 'AU', name: 'Australia', language: 'en', flag: '🇦🇺' },
  'NZ': { code: 'NZ', name: 'New Zealand', language: 'en', flag: '🇳🇿' },
  'CA': { code: 'CA', name: 'Canada', language: 'en', flag: '🇨🇦' },
  'ZA': { code: 'ZA', name: 'South Africa', language: 'en', flag: '🇿🇦' },
  'IE': { code: 'IE', name: 'Ireland', language: 'en', flag: '🇮🇪' },

  // German-speaking
  'DE': { code: 'DE', name: 'Germany', language: 'de', flag: '🇩🇪' },
  'AT': { code: 'AT', name: 'Austria', language: 'de', flag: '🇦🇹' },
  'CH': { code: 'CH', name: 'Switzerland', language: 'de', flag: '🇨🇭' },
  'LU': { code: 'LU', name: 'Luxembourg', language: 'de', flag: '🇱🇺' },

  // French-speaking
  'FR': { code: 'FR', name: 'France', language: 'fr', flag: '🇫🇷' },
  'BE': { code: 'BE', name: 'Belgium', language: 'nl', flag: '🇧🇪' },

  // Spanish-speaking
  'ES': { code: 'ES', name: 'Spain', language: 'es', flag: '🇪🇸' },
  'CL': { code: 'CL', name: 'Chile', language: 'es', flag: '🇨🇱' },
  'MX': { code: 'MX', name: 'Mexico', language: 'es', flag: '🇲🇽' },
  'AR': { code: 'AR', name: 'Argentina', language: 'es', flag: '🇦🇷' },

  // Portuguese-speaking
  'PT': { code: 'PT', name: 'Portugal', language: 'pt', flag: '🇵🇹' },
  'BR': { code: 'BR', name: 'Brazil', language: 'pt-BR', flag: '🇧🇷' },

  // Other European
  'IT': { code: 'IT', name: 'Italy', language: 'it', flag: '🇮🇹' },
  'NL': { code: 'NL', name: 'Netherlands', language: 'nl', flag: '🇳🇱' },
  'PL': { code: 'PL', name: 'Poland', language: 'pl', flag: '🇵🇱' },
  'SE': { code: 'SE', name: 'Sweden', language: 'sv', flag: '🇸🇪' },
  'NO': { code: 'NO', name: 'Norway', language: 'no', flag: '🇳🇴' },
  'DK': { code: 'DK', name: 'Denmark', language: 'da', flag: '🇩🇰' },
  'FI': { code: 'FI', name: 'Finland', language: 'fi', flag: '🇫🇮' },
  'CZ': { code: 'CZ', name: 'Czech Republic', language: 'cs', flag: '🇨🇿' },
  'SK': { code: 'SK', name: 'Slovakia', language: 'sk', flag: '🇸🇰' },
  'HU': { code: 'HU', name: 'Hungary', language: 'hu', flag: '🇭🇺' },
  'RO': { code: 'RO', name: 'Romania', language: 'ro', flag: '🇷🇴' },
  'GR': { code: 'GR', name: 'Greece', language: 'el', flag: '🇬🇷' },
  'CY': { code: 'CY', name: 'Cyprus', language: 'el', flag: '🇨🇾' },
  'LT': { code: 'LT', name: 'Lithuania', language: 'lt', flag: '🇱🇹' },
  'EE': { code: 'EE', name: 'Estonia', language: 'et', flag: '🇪🇪' },
  'SI': { code: 'SI', name: 'Slovenia', language: 'sl', flag: '🇸🇮' },
  'HR': { code: 'HR', name: 'Croatia', language: 'hr', flag: '🇭🇷' },
  'UA': { code: 'UA', name: 'Ukraine', language: 'uk', flag: '🇺🇦' },

  // Asian
  'JP': { code: 'JP', name: 'Japan', language: 'ja', flag: '🇯🇵' },
  'KR': { code: 'KR', name: 'South Korea', language: 'ko', flag: '🇰🇷' },

  // Middle East
  'IL': { code: 'IL', name: 'Israel', language: 'he', flag: '🇮🇱' },
};

/**
 * Get language config by country code
 */
export function getLanguageByCountry(countryCode: CountryCode): LanguageConfig {
  const country = COUNTRIES[countryCode];
  return LANGUAGES[country.language];
}

/**
 * Get all countries for a language
 */
export function getCountriesByLanguage(languageCode: LanguageCode): CountryConfig[] {
  return Object.values(COUNTRIES).filter(c => c.language === languageCode);
}

/**
 * Get sorted list of all countries (for dropdown)
 */
export function getAllCountriesSorted(): CountryConfig[] {
  return Object.values(COUNTRIES).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get sorted list of all languages (for dropdown)
 */
export function getAllLanguagesSorted(): LanguageConfig[] {
  return Object.values(LANGUAGES).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Language-specific content guidelines for the AI
 */
export const LANGUAGE_GUIDELINES: Record<LanguageCode, string> = {
  'en': 'Use casual, conversational American English. Be direct and engaging.',
  'de': 'Use formal "Sie" form. German tends to be more direct. Compound words are common.',
  'fr': 'Use "vous" form. French copy should be elegant and sophisticated.',
  'es': 'Use "tú" form for casual dating. Be warm and passionate in tone.',
  'pt': 'Use European Portuguese. More formal than Brazilian Portuguese.',
  'pt-BR': 'Use Brazilian Portuguese with "você". More casual and warm than European.',
  'it': 'Use "tu" form. Italian should be expressive and romantic.',
  'nl': 'Use "je/jij" form. Dutch is direct and to the point.',
  'ja': 'Use polite form (です/ます). Keep sentences shorter. Avoid direct translations.',
  'ko': 'Use polite form (요/습니다). Honorifics matter. Cultural sensitivity required.',
  'pl': 'Use "ty" form for casual. Polish has formal grammar rules.',
  'sv': 'Use "du" form. Swedish is casual and egalitarian.',
  'no': 'Use "du" form. Similar to Swedish, casual and direct.',
  'da': 'Use "du" form. Danish is informal and straightforward.',
  'fi': 'Use "sinä" form. Finnish is very different grammatically - avoid literal translations.',
  'cs': 'Use "ty" form for casual. Czech has formal declensions.',
  'sk': 'Use "ty" form. Similar to Czech but distinct.',
  'hu': 'Use "te" form. Hungarian grammar is unique - professional translation recommended.',
  'ro': 'Use "tu" form. Romanian is a Romance language with some unique features.',
  'el': 'Use "εσύ" form. Greek has unique alphabet - ensure proper encoding.',
  'lt': 'Use "tu" form. Lithuanian is an archaic Baltic language.',
  'et': 'Use "sina" form. Estonian is related to Finnish.',
  'sl': 'Use "ti" form. Slovenian has dual grammatical number.',
  'hr': 'Use "ti" form. Croatian uses Latin alphabet.',
  'uk': 'Use "ти" form for casual. Ukrainian uses Cyrillic - ensure proper encoding.',
  'he': 'Right-to-left language. Hebrew has gendered grammar. Modern Hebrew for web.',
};
