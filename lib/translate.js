const PUBLIC_INSTANCES = [
  'https://libretranslate.com',
  'https://translate.argosopentech.com',
  'https://translate.fedilab.app',
];

let currentInstance = 0;

async function translateText(text, source = 'ar', target = 'en') {
  if (!text || text.trim().length === 0) return text;

  // Skip if mostly ASCII (already English)
  const asciiCount = (text.match(/[\x00-\x7F]/g) || []).length;
  if (asciiCount / text.length > 0.7) return text;

  for (let attempt = 0; attempt < PUBLIC_INSTANCES.length; attempt++) {
    const idx = (currentInstance + attempt) % PUBLIC_INSTANCES.length;
    const instance = PUBLIC_INSTANCES[idx];

    try {
      const res = await fetch(`${instance}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source,
          target,
          format: 'text',
        }),
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (data && data.translatedText) {
        currentInstance = idx;
        return data.translatedText;
      }
    } catch {
      continue;
    }
  }

  return text;
}

async function translateTitle(parsed) {
  // If regex already extracted English show name, return it
  if (parsed.english && !/[\u0600-\u06FF]/.test(parsed.english)) {
    return parsed;
  }

  // Try translating the full clean title
  const translated = await translateText(parsed.clean);
  if (translated !== parsed.clean) {
    return { ...parsed, english: translated };
  }

  return parsed;
}

export { translateText, translateTitle };
