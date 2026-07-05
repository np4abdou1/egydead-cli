const ARABIC_NUMBERS = {
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
};

function arabicWordToNum(word) {
  return ARABIC_NUMBERS[word] || word;
}

// All known Arabic structural words that should be stripped
const ARABIC_STRUCTURAL = /^(?:مشاهدة|تحميل|مسلسل|انمي|فيلم|برنامج|مسلسلات|افلام)\s+/i;
const ARABIC_SUFFIX = /\s+(?:مترجمة|مترجم|مدبلجة|مدبلج|كاملة|كامل|اونلاين|اون لاين|الجودة|الجديد|القديم|الاخيرة|الحلقة|حلقه|مدبلج|مدبلجة)\s*/gi;
const ARABIC_CATEGORY = /\s*\|.*$/;

function parseTitle(raw) {
  if (!raw) return { english: raw, season: null, episode: null, isMovie: false, clean: raw };

  let title = raw.trim();
  let season = null;
  let episode = null;
  let isMovie = false;

  // Strip website suffix: "  | ايجي ديد" or similar
  title = title.replace(/\s*\|\s*.+$/, '').trim();

  // --- Pattern 1: Prefix Show Name Season/Part X Episode Y ---
  let prefixes = '(?:مسلسل|مسلسلات|انمي|برنامج|افلام)';
  let seasonWords = '(?:الموسم|الجزء)';
  let epPattern = `^${prefixes}\\s+(.+?)\\s+${seasonWords}\\s+(\\S+)\\s+الحلقة\\s+(\\d+)\\s*(.*)$`;

  let m = title.match(new RegExp(epPattern));
  if (m) {
    let show = m[1].trim();
    let rawSeason = m[2].trim();
    season = arabicWordToNum(rawSeason);
    episode = m[3];
    return {
      english: `${show} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`,
      show, season, episode, isMovie: false, clean: title,
    };
  }

  // --- Pattern 2: Anime: انمي Show Name الحلقة Y ---
  m = title.match(/^انمي\s+(.+?)\s+الحلقة\s+(\d+)\s*(.*)$/);
  if (m) {
    let show = m[1].trim();
    episode = m[2];
    return {
      english: `${show} E${String(episode).padStart(2, '0')}`,
      show, season: null, episode, isMovie: false, clean: title,
    };
  }

  // --- Pattern 3: Prefix Show Name Season/Part X (no episode, season page) ---
  let epPattern2 = `^${prefixes}\\s+(.+?)\\s+${seasonWords}\\s+(\\S+)\\s*(.*)$`;
  m = title.match(new RegExp(epPattern2));
  if (m) {
    let show = m[1].trim();
    let rawSeason = m[2].trim();
    season = arabicWordToNum(rawSeason);
    return {
      english: `${show} S${String(season).padStart(2, '0')}`,
      show, season, episode: null, isMovie: false, clean: title,
    };
  }

  // --- Pattern 4: Prefix Show Name without season, just episode ---
  m = title.match(new RegExp(`^${prefixes}\\s+(.+?)\\s+الحلقة\\s+(\\d+)\\s*(.*)$`));
  if (m) {
    let show = m[1].trim();
    episode = m[2];
    return {
      english: `${show} E${String(episode).padStart(2, '0')}`,
      show, season: null, episode, isMovie: false, clean: title,
    };
  }

  // --- Pattern 5: مشاهدة فيلم Movie Name YEAR ---
  m = title.match(/^مشاهدة فيلم\s+(.+?)\s+(\d{4})\s*(.*)$/);
  if (m) {
    isMovie = true;
    let movie = m[1].trim();
    let year = m[2];
    return {
      english: `${movie} (${year})`,
      show: movie, season: null, episode: null, isMovie: true, clean: title, year,
    };
  }

  // --- Pattern 6: فيلم Movie Name YEAR ---
  m = title.match(/^فيلم\s+(.+?)\s+(\d{4})\s*(.*)$/);
  if (m) {
    isMovie = true;
    let movie = m[1].trim();
    let year = m[2];
    return {
      english: `${movie} (${year})`,
      show: movie, season: null, episode: null, isMovie: true, clean: title, year,
    };
  }

  // --- Pattern 7: English "Season N Episode N" ---
  m = title.match(/^(.+?)\s+Season\s+(\d+)\s+Episode\s+(\d+)/i);
  if (m) {
    let show = m[1].trim();
    season = m[2];
    episode = m[3];
    return {
      english: `${show} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`,
      show, season, episode, isMovie: false, clean: title,
    };
  }

  // --- Pattern 8: مشاهدة (no فيلم) Movie Name YEAR ---
  m = title.match(/^مشاهدة\s+(.+?)\s+(\d{4})\s*(.*)$/);
  if (m) {
    isMovie = true;
    let movie = m[1].trim();
    let year = m[2];
    return {
      english: `${movie} (${year})`,
      show: movie, season: null, episode: null, isMovie: true, clean: title, year,
    };
  }

  // --- Pattern 9: Arabic structure "الجزء X الحلقة Y" embedded in text (no prefix) ---
  m = title.match(new RegExp(`^(.+?)\\s+${seasonWords}\\s+(\\S+)\\s+الحلقة\\s+(\\d+)\\s*(.*)$`));
  if (m) {
    let show = m[1].trim();
    let rawSeason = m[2].trim();
    season = arabicWordToNum(rawSeason);
    episode = m[3];
    return {
      english: `${show} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`,
      show, season, episode, isMovie: false, clean: title,
    };
  }

  // --- Pattern 10: Arabic structure with just episode ---
  m = title.match(/^(.+?)\s+الحلقة\s+(\d+)\s*(.*)$/);
  if (m) {
    let show = m[1].trim();
    episode = m[2];
    return {
      english: `${show} E${String(episode).padStart(2, '0')}`,
      show, season: null, episode, isMovie: false, clean: title,
    };
  }

  // --- Pattern 11: Arabic prefix + YEAR (documentary/movie without فيلم) ---
  m = title.match(new RegExp(`^${prefixes}\\s+(.+?)\\s+(\\d{4})\\s*(.*)$`));
  if (m) {
    let show = m[1].trim();
    let year = m[2];
    return {
      english: `${show} (${year})`,
      show, season: null, episode: null, isMovie: false, clean: title, year,
    };
  }

  // --- Fallback: strip all known Arabic structural elements ---
  let cleaned = title
    .replace(ARABIC_STRUCTURAL, '')
    .replace(ARABIC_SUFFIX, '')
    .replace(ARABIC_CATEGORY, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // If cleaning left nothing useful, return original
  if (!cleaned || cleaned.length < 2) {
    return {
      english: title,
      show: title,
      season: null, episode: null, isMovie: false, clean: title,
    };
  }

  return {
    english: cleaned,
    show: cleaned,
    season: null, episode: null, isMovie: false, clean: title,
  };
}

function extractEpisodeNum(title, url) {
  let m = url.match(/[sS](\d+)[eE](\d+)/);
  if (m) return { season: m[1], episode: m[2] };
  m = url.match(/[eE](\d+)/);
  if (m) return { season: null, episode: m[1] };

  const parsed = parseTitle(title);
  return { season: parsed.season, episode: parsed.episode };
}

function incrementEpisode(season, episode) {
  const ep = parseInt(episode, 10);
  if (isNaN(ep)) return null;
  return {
    season: season ? String(parseInt(season, 10)).padStart(2, '0') : null,
    episode: String(ep + 1).padStart(2, '0'),
  };
}

export { parseTitle, extractEpisodeNum, incrementEpisode, ARABIC_NUMBERS };
