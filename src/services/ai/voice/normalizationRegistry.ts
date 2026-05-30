export interface SynonymMap {
  [canonical: string]: string[];
}

/**
 * Phonetic Devanagari representations of English expense words mapping to their canonical English spellings.
 */
export const PHONETIC_DEVANAGARI_MAP: Record<string, string> = {
  // verbs
  'इस्पेंट': 'spent',
  'इस्पेट': 'spent',
  'पुर्चाइब': 'purchase',
  'पुर्चाइब्ड': 'purchased',
  'पुलिए स्टाइब': 'please type', // commonly heard audio artifacts
  'पुलिएस': 'please',
  'बायड': 'bought',
  'पेड': 'paid',
  'पेद': 'paid',
  'अर्दर्ड': 'ordered',
  'गोट': 'got',
  // items & metrics
  'रुपैयाँ': 'rupees',
  'रुपैया': 'rupees',
  'रु': 'rupees',
  'लिटर': 'liters',
  'ली': 'liters',
  'केजी': 'kg',
  'पेट्रोल': 'petrol',
  'डिजेल': 'diesel',
  'ग्यास': 'gas',
  'मोमो': 'momo',
  'बस भाडा': 'bus fare',
  'भाडा': 'rent',
  'कोठा भाडा': 'room rent',
};

/**
 * Maps English synonyms and Nepali/Romanized synonyms into clean canonical verbs/intents.
 */
export const VERB_INTENT_SYNONYMS: SynonymMap = {
  purchase: [
    'buy', 'bought', 'purchased', 'purchase', 'ordered', 'order', 'procured',
    'kinna', 'kine', 'kineko', 'kinnu', 'kharid', 'kharid gareko', 'kinyo',
    'kinyau', 'किने', 'किनेको', 'किन्नु', 'खरिद', 'खरिद गरेको',
  ],
  spent: [
    'spent', 'spend', 'expended', 'paid', 'pay', 'had', 'got', 'took', 'give', 'gave',
    'kharch', 'kharcha', 'kharche', 'kharchiyeko', 'kharcha gareko', 'haleko', 'bhareko',
    'khayeko', 'khaye', 'khako', 'khayeko', 'thapyo', 'diyeko', 'diye',
    'खर्च', 'खर्च गरे', 'खर्च गरेको', 'हालेको', 'भरेको', 'खाएको', 'खाएँ', 'दिएको', 'दिए',
  ],
  income: [
    'earned', 'earn', 'got salary', 'salary', 'received', 'receive', 'deposited',
    'kamako', 'kamaye', 'salary aayo', 'aayo', 'paisa aayo', 'paisa thapyo',
    'कमाएको', 'कमाएँ', 'तलब', 'आयो', 'पैसा आयो',
  ]
};

/**
 * Maps item synonyms and variations into clean canonical items.
 */
export const ITEM_SYNONYMS: SynonymMap = {
  fuel: [
    'petrol', 'diesel', 'fuel', 'gas', 'gasoline', 'octane', 'mobil', 'bike fuel', 'car fuel',
    'petrol haleko', 'diesel haleko', 'fuel bhareko', 'petrol bhareko',
    'पेट्रोल', 'डिजेल', 'ग्यास', 'इन्धन',
  ],
  momo: [
    'momo', 'dumplings', 'momos', 'mo:mo', 'momo khako', 'c-momo', 'jhol momo',
    'मम', 'म:म', 'मम खाएको', 'म:म खाएको',
  ],
  bus_fare: [
    'bus', 'bus fare', 'bus rent', 'cab', 'taxi', 'taxi fare', 'micro', 'micro fare',
    'bus vada', 'bus bhada', 'bus vadha', 'micro bhada', 'taxi bhada',
    'बस भाडा', 'बस', 'ट्याक्सी', 'ट्याक्सी भाडा', 'माइक्रो', 'माइक्रो भाडा',
  ],
  room_rent: [
    'rent', 'room rent', 'house rent', 'flat rent', 'apartment rent',
    'vada', 'bhada', 'kotha bhada', 'kotha vada', 'ghar bhada',
    'भाडा', 'कोठा भाडा', 'घर भाडा',
  ],
  groceries: [
    'groceries', 'grocery', 'vegetables', 'vegetable', 'milk', 'tarkari', 'dudh', 'fruits',
    'tarkari kineko', 'dudh kineko', 'chawal', 'chamal',
    'तरकारी', 'दूध', 'फलफूल', 'चामल', 'खाद्यान्न',
  ]
};

/**
 * Romanized Nepali numbers mapping to digits.
 */
export const ROMANIZED_NUMBERS: Record<string, number> = {
  'panch se': 500,
  'panch shay': 500,
  'tin se': 300,
  'tin shay': 300,
  'dui se': 200,
  'ek hajar': 1000,
  'dui hajar': 2000,
  'panch hajar': 5000,
  'dui hajar panch se': 2500,
  'panchas': 50,
  'saya': 100,
  'se': 100,
  'tin hajar': 3000,
  'char se': 400,
  'char hajar': 4000,
  'ek hajar panch se': 1500,
};
