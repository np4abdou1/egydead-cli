import re
from typing import Optional

ARABIC_NUMBERS = {
    'الاولى': '1', 'الأولى': '1', 'الاول': '1', 'الأول': '1',
    'الثانية': '2', 'الثانية': '2', 'الثاني': '2', 'الثاني': '2',
    'الثالثة': '3', 'الثالثه': '3', 'الثالث': '3',
    'الرابعة': '4', 'الرابعه': '4', 'الرابع': '4',
    'الخامسة': '5', 'الخامسه': '5', 'الخامس': '5',
    'السادسة': '6', 'السادسه': '6', 'السادس': '6',
    'السابعة': '7', 'السابعه': '7', 'السابع': '7',
    'الثامنة': '8', 'الثامنه': '8', 'الثامن': '8',
    'التاسعة': '9', 'التاسعه': '9', 'التاسع': '9',
    'العاشرة': '10', 'العاشره': '10', 'العاشر': '10',
    'الحادي عشر': '11', 'الحادية عشر': '11',
    'الثاني عشر': '12', 'الثانية عشر': '12',
}


def arabic_word_to_num(word: str) -> str:
    return ARABIC_NUMBERS.get(word, word)


PREFIXES = r'(?:مسلسل|مسلسلات|انمي|برنامج|افلام)'
SEASON_WORDS = r'(?:الموسم|الجزء)'

ARABIC_STRUCTURAL = re.compile(r'^(?:مشاهدة|تحميل|مسلسل|انمي|فيلم|برنامج|مسلسلات|افلام)\s+', re.I)
ARABIC_SUFFIX = re.compile(r'\s+(?:مترجمة|مترجم|مدبلجة|مدبلج|كاملة|كامل|اونلاين|اون لاين|الجودة|الجديد|القديم|الاخيرة|الحلقة|حلقه|مدبلج|مدبلجة)\s*', re.I)


def parse_title(raw: str) -> dict:
    if not raw:
        return {'english': raw, 'season': None, 'episode': None, 'is_movie': False, 'clean': raw}

    title = raw.strip()
    season = None
    episode = None
    is_movie = False

    title = re.sub(r'\s*\|\s*.+$', '', title).strip()

    # Pattern 1: Prefix Show Name Season/Part X Episode Y
    m = re.match(rf'^{PREFIXES}\s+(.+?)\s+{SEASON_WORDS}\s+(\S+)\s+الحلقة\s+(\d+)\s*(.*)$', title)
    if m:
        show = m.group(1).strip()
        raw_season = m.group(2).strip()
        season = arabic_word_to_num(raw_season)
        episode = m.group(3)
        return {
            'english': f'{show} S{int(season):02d}E{int(episode):02d}',
            'show': show, 'season': season, 'episode': episode,
            'is_movie': False, 'clean': title,
        }

    # Pattern 2: Anime
    m = re.match(r'^انمي\s+(.+?)\s+الحلقة\s+(\d+)\s*(.*)$', title)
    if m:
        show = m.group(1).strip()
        episode = m.group(2)
        return {
            'english': f'{show} E{int(episode):02d}',
            'show': show, 'season': None, 'episode': episode,
            'is_movie': False, 'clean': title,
        }

    # Pattern 3: Prefix Show Name Season/Part X (season page)
    m = re.match(rf'^{PREFIXES}\s+(.+?)\s+{SEASON_WORDS}\s+(\S+)\s*(.*)$', title)
    if m:
        show = m.group(1).strip()
        raw_season = m.group(2).strip()
        season = arabic_word_to_num(raw_season)
        return {
            'english': f'{show} S{int(season):02d}',
            'show': show, 'season': season, 'episode': None,
            'is_movie': False, 'clean': title,
        }

    # Pattern 4: Prefix Show Name Episode only (no season)
    m = re.match(rf'^{PREFIXES}\s+(.+?)\s+الحلقة\s+(\d+)\s*(.*)$', title)
    if m:
        show = m.group(1).strip()
        episode = m.group(2)
        return {
            'english': f'{show} E{int(episode):02d}',
            'show': show, 'season': None, 'episode': episode,
            'is_movie': False, 'clean': title,
        }

    # Pattern 5: مشاهدة فيلم Movie Name YEAR
    m = re.match(r'^مشاهدة فيلم\s+(.+?)\s+(\d{4})\s*(.*)$', title)
    if m:
        is_movie = True
        movie = m.group(1).strip()
        year = m.group(2)
        return {
            'english': f'{movie} ({year})',
            'show': movie, 'season': None, 'episode': None,
            'is_movie': True, 'clean': title, 'year': year,
        }

    # Pattern 6: فيلم Movie Name YEAR
    m = re.match(r'^فيلم\s+(.+?)\s+(\d{4})\s*(.*)$', title)
    if m:
        is_movie = True
        movie = m.group(1).strip()
        year = m.group(2)
        return {
            'english': f'{movie} ({year})',
            'show': movie, 'season': None, 'episode': None,
            'is_movie': True, 'clean': title, 'year': year,
        }

    # Pattern 7: English "Season N Episode N"
    m = re.match(r'^(.+?)\s+Season\s+(\d+)\s+Episode\s+(\d+)', title, re.I)
    if m:
        show = m.group(1).strip()
        season = m.group(2)
        episode = m.group(3)
        return {
            'english': f'{show} S{int(season):02d}E{int(episode):02d}',
            'show': show, 'season': season, 'episode': episode,
            'is_movie': False, 'clean': title,
        }

    # Pattern 8: Arabic structure with Season/Part and Episode (no prefix)
    m = re.match(rf'^(.+?)\s+{SEASON_WORDS}\s+(\S+)\s+الحلقة\s+(\d+)\s*(.*)$', title)
    if m:
        show = m.group(1).strip()
        raw_season = m.group(2).strip()
        season = arabic_word_to_num(raw_season)
        episode = m.group(3)
        return {
            'english': f'{show} S{int(season):02d}E{int(episode):02d}',
            'show': show, 'season': season, 'episode': episode,
            'is_movie': False, 'clean': title,
        }

    # Pattern 9: Arabic structure with just episode (no prefix)
    m = re.match(r'^(.+?)\s+الحلقة\s+(\d+)\s*(.*)$', title)
    if m:
        show = m.group(1).strip()
        episode = m.group(2)
        return {
            'english': f'{show} E{int(episode):02d}',
            'show': show, 'season': None, 'episode': episode,
            'is_movie': False, 'clean': title,
        }

    # Pattern 10: Prefix + YEAR (documentary without فيلم)
    m = re.match(rf'^{PREFIXES}\s+(.+?)\s+(\d{{4}})\s*(.*)$', title)
    if m:
        show = m.group(1).strip()
        year = m.group(2)
        return {
            'english': f'{show} ({year})',
            'show': show, 'season': None, 'episode': None,
            'is_movie': False, 'clean': title, 'year': year,
        }

    # Fallback: strip known Arabic structural words
    cleaned = ARABIC_STRUCTURAL.sub('', title)
    cleaned = ARABIC_SUFFIX.sub('', cleaned)
    cleaned = re.sub(r'\s*\|\s*.+$', '', cleaned)
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()

    if not cleaned or len(cleaned) < 2:
        return {
            'english': title, 'show': title,
            'season': None, 'episode': None,
            'is_movie': False, 'clean': title,
        }

    return {
        'english': cleaned, 'show': cleaned,
        'season': None, 'episode': None,
        'is_movie': False, 'clean': title,
    }


def extract_episode_num(title: str, url: str) -> dict:
    m = re.search(r'[sS](\d+)[eE](\d+)', url)
    if m:
        return {'season': m.group(1), 'episode': m.group(2)}
    m = re.search(r'[eE](\d+)', url)
    if m:
        return {'season': None, 'episode': m.group(1)}
    parsed = parse_title(title)
    return {'season': parsed['season'], 'episode': parsed['episode']}


def increment_episode(season: Optional[str], episode: str) -> Optional[dict]:
    try:
        ep = int(episode)
    except (ValueError, TypeError):
        return None
    return {
        'season': f'{int(season):02d}' if season else None,
        'episode': f'{ep + 1:02d}',
    }
