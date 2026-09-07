export const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

const MULTI_LANG_NUMBERS: Record<string, number> = {
  // ASCII Digits
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  // Eastern Nagari / Bengali Digits
  '১': 1, '২': 2, '৩': 3, '৪': 4, '৫': 5, '৬': 6, '৭': 7, '৮': 8, '৯': 9, '১০': 10,
  // Devanagari (Hindi/Marathi) Digits
  '१': 1, '२': 2, '३': 3, '४': 4, '५': 5, '६': 6, '७': 7, '८': 8, '९': 9, '१०': 10,
  // Gurmukhi (Punjabi) Digits
  '੧': 1, '੨': 2, '੩': 3, '੪': 4, '੫': 5, '੬': 6, '੭': 7, '੮': 8, '੯': 9, '੧੦': 10,
  // Telugu Digits
  '౧': 1, '౨': 2, '౩': 3, '౪': 4, '౫': 5, '౬': 6, '౭': 7, '౮': 8, '౯': 9, '౧౦': 10,
  // Tamil Digits
  '௧': 1, '௨': 2, '௩': 3, '௪': 4, '௫': 5, '௬': 6, '௭': 7, '௮': 8, '௯': 9, '௰': 10,
  
  // English Words & Yes Affirmatives
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
  'yes': 1, 'yeah': 1, 'yep': 1, 'ok': 1, 'okay': 1,

  // Hindi / Hinglish Words & Affirmatives
  'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5, 'chhah': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10,
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'पहला': 1, 'दूसरा': 2, 'तीसरा': 3, 'चौथा': 4, 'पांचवा': 5,
  'हाँ': 1, 'हां': 1, 'हाँजी': 1, 'सही': 1,

  // Bengali Words & Affirmatives
  'এক': 1, 'দুই': 2, 'তিন': 3, 'চার': 4, 'পাঁচ': 5, 'ছয়': 6, 'সাত': 7, 'আট': 8, 'নয়': 9, 'দশ': 10,
  'প্রথম': 1, 'দ্বিতীয়': 2, 'তৃতীয়': 3,
  'হ্যাঁ': 1, 'ঠিক': 1,

  // Marathi Words & Affirmatives
  'दोन': 2, 'पाच': 5, 'सहा': 6, 'नऊ': 9, 'दहा': 10,
  'होय': 1, 'हो': 1,

  // Telugu Words & Affirmatives
  'ఒకటి': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5, 'ఆరు': 6, 'ఏడు': 7, 'ఎనిమిది': 8, 'తొమ్మిది': 9, 'పది': 10,
  'అవును': 1, 'సరే': 1,

  // Tamil Words & Affirmatives
  'ஒன்று': 1, 'இரண்டு': 2, 'மூன்று': 3, 'நான்கு': 4, 'ஐந்து': 5, 'ஆறு': 6, 'ஏழு': 7, 'எட்டு': 8, 'ஒன்பது': 9, 'பத்து': 10,
  'ஆம்': 1, 'சரி': 1,

  // Punjabi Words & Affirmatives
  'ਇੱਕ': 1, 'ਦੋ': 2, 'ਤਿੰਨ': 3, 'ਚਾਰ': 4, 'ਪੰਜ': 5, 'ਛੇ': 6, 'ਸੱਤ': 7, 'ਅੱਠ': 8, 'ਨੌਂ': 9, 'ਦੱਸ': 10,
  'ਹਾਂ': 1, 'ਜੀ': 1
};

export const parseNumberFromText = (text: string): number | null => {
  if (!text) return null;
  const clean = text.trim().toLowerCase();
  
  // 1. Direct map lookup
  if (MULTI_LANG_NUMBERS[clean] !== undefined) {
    return MULTI_LANG_NUMBERS[clean];
  }

  // 2. Tokenize and search for mapped word or digit
  const tokens = clean.split(/[\s,.-]+/);
  for (const token of tokens) {
    if (MULTI_LANG_NUMBERS[token] !== undefined) {
      return MULTI_LANG_NUMBERS[token];
    }
  }

  // 3. Regex match for single digit or 10
  const match = clean.match(/([1-9]|10)/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
};
