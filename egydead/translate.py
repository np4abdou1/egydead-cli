import json
import re
import urllib.request
import urllib.error

PUBLIC_INSTANCES = [
    'https://libretranslate.com',
    'https://translate.argosopentech.com',
    'https://translate.fedilab.app',
]

_current_instance = 0


async def translate_text(text: str, source: str = 'ar', target: str = 'en') -> str:
    if not text or not text.strip():
        return text

    ascii_count = len(re.findall(r'[\x00-\x7F]', text))
    if ascii_count / max(len(text), 1) > 0.7:
        return text

    global _current_instance
    for attempt in range(len(PUBLIC_INSTANCES)):
        idx = (_current_instance + attempt) % len(PUBLIC_INSTANCES)
        instance = PUBLIC_INSTANCES[idx]

        try:
            body = json.dumps({
                'q': text,
                'source': source,
                'target': target,
                'format': 'text',
            }).encode()

            req = urllib.request.Request(
                f'{instance}/translate',
                data=body,
                headers={'Content-Type': 'application/json'},
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                if data and data.get('translatedText'):
                    _current_instance = idx
                    return data['translatedText']
        except (urllib.error.URLError, json.JSONDecodeError, OSError):
            continue

    return text


async def translate_title(parsed: dict) -> dict:
    english = parsed.get('english', '')
    if english and not re.search(r'[\u0600-\u06FF]', english):
        return parsed
    translated = await translate_text(parsed.get('clean', ''))
    if translated != parsed.get('clean'):
        return {**parsed, 'english': translated}
    return parsed
