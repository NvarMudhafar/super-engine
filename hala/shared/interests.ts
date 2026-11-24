import { LIMITS } from './protocol.ts';

/**
 * Interests are shown the way the person typed them, but matched on a folded
 * "key", so spelling variants, Arabic/English pairs and Iraqi slang meet:
 * «كرة القدم», «كره قدم», «طوبة» and "Football" all match each other.
 */

/** Display form: tidy whitespace and punctuation, keep the person's spelling. */
export function normalizeInterest(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[^\p{L}\p{N}\p{M}\s+\-&'.]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LIMITS.interest)
    .trim();
}

const LETTER_FOLD: Record<string, string> = {
  أ: 'ا',
  إ: 'ا',
  آ: 'ا',
  ٱ: 'ا',
  ى: 'ي',
  ة: 'ه',
  ؤ: 'و',
  ئ: 'ي',
  // Persian/Kurdish keyboards, common in Iraq, type these look-alikes.
  ک: 'ك',
  ی: 'ي',
  ې: 'ي',
  ھ: 'ه',
  ە: 'ه',
};

/** Spelling-insensitive form, before synonyms are applied. */
function fold(tag: string): string {
  return normalizeInterest(tag)
    .replace(/[ً-ٰٟـ]/g, '') // harakat, dagger alef, tatweel
    .replace(/[أإآٱىةؤئکیېھە]/g, (c) => LETTER_FOLD[c] ?? c)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
    .split(/[\s\-&'.+]+/)
    .filter(Boolean)
    // Drop the definite article: «الشعر» ≈ «شعر», «البصرة» ≈ «بصرة».
    .map((w) => (w.length > 3 && w.startsWith('ال') ? w.slice(2) : w))
    .join(' ');
}

/** Words that mean the same thing. The first entry names the group. */
const GROUPS: string[][] = [
  ['football', 'soccer', 'كرة القدم', 'كرة قدم', 'طوبة', 'فوتبول'],
  ['music', 'موسيقى', 'موسيقة', 'أغاني', 'اغاني', 'songs'],
  ['iraqi music', 'أغاني عراقية', 'اغاني عراقيه', 'طرب عراقي'],
  ['maqam', 'iraqi maqam', 'مقام', 'المقام العراقي'],
  ['poetry', 'شعر', 'قصائد'],
  ['folk poetry', 'شعر شعبي', 'الشعر الشعبي', 'دارمي', 'أبوذية', 'ابوذيه'],
  ['movies', 'movie', 'films', 'film', 'أفلام', 'افلام', 'سينما'],
  ['series', 'tv', 'tv shows', 'مسلسلات', 'مسلسل'],
  ['gaming', 'games', 'video games', 'ألعاب', 'العاب', 'گيمنگ', 'كيمنك', 'جيمنج', 'بلايستيشن', 'playstation'],
  ['pubg', 'ببجي', 'پبجي', 'pubg mobile'],
  ['books', 'reading', 'كتب', 'قراءة', 'قراية'],
  ['cooking', 'food', 'طبخ', 'أكل', 'اكل', 'أكلات عراقية'],
  ['travel', 'سفر', 'سفرات', 'سياحة'],
  ['tech', 'technology', 'تكنولوجيا', 'تقنية'],
  ['programming', 'coding', 'برمجة'],
  ['anime', 'أنمي', 'انمي', 'انيمي'],
  ['art', 'drawing', 'فن', 'رسم'],
  ['sports', 'رياضة'],
  ['gym', 'fitness', 'جيم', 'كمال أجسام', 'كمال اجسام'],
  ['cars', 'سيارات', 'سياير'],
  ['photography', 'تصوير'],
  ['english', 'learning english', 'language exchange', 'إنجليزي', 'انجليزي', 'انكليزي', 'انگليزي', 'لغة إنجليزية'],
  ['history', 'تاريخ', 'تأريخ'],
  ['religion', 'دين', 'إسلام', 'اسلام'],
  ['fashion', 'أزياء', 'ازياء', 'موضة'],
];

/**
 * Iraqi cities, for "people near me". Picking one is just another interest,
 * so two people from Basra are matched first — and it's only ever shown to
 * someone who picked the same city.
 */
export const PLACES: Array<{ key: string; ar: string; en: string; also?: string[] }> = [
  { key: 'baghdad', ar: 'بغداد', en: 'Baghdad' },
  { key: 'basra', ar: 'البصرة', en: 'Basra', also: ['basrah'] },
  { key: 'mosul', ar: 'الموصل', en: 'Mosul', also: ['nineveh', 'نينوى'] },
  { key: 'erbil', ar: 'أربيل', en: 'Erbil', also: ['arbil', 'hawler', 'هولير', 'هەولێر'] },
  { key: 'sulaymaniyah', ar: 'السليمانية', en: 'Sulaymaniyah', also: ['sulaimani', 'slemani', 'سليماني'] },
  { key: 'najaf', ar: 'النجف', en: 'Najaf' },
  { key: 'karbala', ar: 'كربلاء', en: 'Karbala', also: ['كربلا'] },
  { key: 'kirkuk', ar: 'كركوك', en: 'Kirkuk' },
  { key: 'duhok', ar: 'دهوك', en: 'Duhok', also: ['dohuk'] },
  { key: 'nasiriyah', ar: 'الناصرية', en: 'Nasiriyah', also: ['ذي قار', 'dhi qar'] },
  { key: 'hillah', ar: 'الحلة', en: 'Hillah', also: ['hilla', 'بابل', 'babylon', 'babil'] },
  { key: 'ramadi', ar: 'الرمادي', en: 'Ramadi', also: ['الأنبار', 'anbar'] },
  { key: 'kut', ar: 'الكوت', en: 'Kut', also: ['واسط', 'wasit'] },
  { key: 'amarah', ar: 'العمارة', en: 'Amarah', also: ['ميسان', 'maysan'] },
  { key: 'diwaniyah', ar: 'الديوانية', en: 'Diwaniyah', also: ['القادسية', 'qadisiyah'] },
  { key: 'samawah', ar: 'السماوة', en: 'Samawah', also: ['المثنى', 'muthanna'] },
  { key: 'baqubah', ar: 'بعقوبة', en: 'Baqubah', also: ['ديالى', 'diyala'] },
  { key: 'tikrit', ar: 'تكريت', en: 'Tikrit', also: ['صلاح الدين', 'salahuddin'] },
  { key: 'halabja', ar: 'حلبجة', en: 'Halabja' },
  { key: 'fallujah', ar: 'الفلوجة', en: 'Fallujah' },
  { key: 'samarra', ar: 'سامراء', en: 'Samarra', also: ['سامرا'] },
  { key: 'zakho', ar: 'زاخو', en: 'Zakho' },
];

const SYNONYMS = new Map<string, string>();
const PLACE_KEYS = new Set<string>();
for (const [name, ...rest] of GROUPS) for (const word of [name, ...rest]) SYNONYMS.set(fold(word), name);
for (const p of PLACES) {
  const key = `@${p.key}`; // can't collide with anything a person types
  PLACE_KEYS.add(key);
  for (const word of [p.key, p.ar, p.en, ...(p.also ?? [])]) SYNONYMS.set(fold(word), key);
}

/** What two interests are compared on. */
export function interestKey(tag: string): string {
  const folded = fold(tag);
  return SYNONYMS.get(folded) ?? folded;
}

/** True when the interest names a city. */
export const isPlace = (tag: string) => PLACE_KEYS.has(interestKey(tag));

/** The city an interest names, if it names one. */
export function placeOf(tag: string) {
  const key = interestKey(tag);
  return PLACE_KEYS.has(key) ? (PLACES.find((p) => `@${p.key}` === key) ?? null) : null;
}

/** Normalise, drop blanks, de-duplicate (by meaning) and cap a list of interests. */
export function normalizeInterests(list: readonly unknown[]): string[] {
  const out: string[] = [];
  const keys = new Set<string>();
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const tag = normalizeInterest(item);
    const key = tag && interestKey(tag);
    if (!key || keys.has(key)) continue;
    out.push(tag);
    keys.add(key);
    if (out.length >= LIMITS.interests) break;
  }
  return out;
}

/** Interests two people share, in the first person's order and spelling. */
export function commonInterests(
  a: readonly string[],
  b: readonly string[],
  aKeys: readonly string[] = a.map(interestKey),
  bKeys: readonly string[] = b.map(interestKey),
): string[] {
  if (a.length === 0 || b.length === 0) return [];
  const other = new Set(bKeys);
  return a.filter((_, i) => other.has(aKeys[i]));
}
