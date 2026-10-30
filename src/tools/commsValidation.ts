import { LanguageCode } from '../state/types.ts';

const PANIC_WORDS = /\b(panic|terr(or|ified)|danger|death|urgent|emergency|disaster|fear)\b|घबराहट|डर|खतरा|संकट|आपातकाल|मृत्यु|मृत्यू|धोका|आपत्ती|घाबरू/iu;

export function isValidCommsText(language: LanguageCode, text: string): boolean {
  const content = text.trim();
  if (!content || Array.from(content).length >= 280 || PANIC_WORDS.test(content)) return false;
  if (!content.includes('1916')) return false;
  const hasLatin = /[A-Za-z]/.test(content);
  const hasDevanagari = /[\u0900-\u097f]/u.test(content);
  if (language === 'en') {
    return hasLatin &&
      !hasDevanagari &&
      /\[(?:SAFE ROUTE|SHELTER)\]/i.test(content) &&
      /\b(update|support|response|assistance|coordinat\w*)\b/i.test(content);
  }
  const placeholder = language === 'hi'
    ? /\[(?:सुरक्षित मार्ग|आश्रय)\]/u
    : /\[(?:सुरक्षित मार्ग|निवारा)\]/u;
  const describesUpdate = language === 'hi'
    ? /(सूचना|सहायता|मदद|समन्वय|दल)/u
    : /(सूचना|मदत|सहाय्य|समन्वय|पथक)/u;
  return hasDevanagari && !hasLatin && placeholder.test(content) && describesUpdate.test(content);
}
