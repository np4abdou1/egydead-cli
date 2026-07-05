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
};

function arabicWordToNum(word) {
  return ARABIC_NUMBERS[word] || word;
}

function parseTitle(raw) {
  if (!raw) return { english: raw, season: null, episode: null, isMovie: false, clean: raw };

  let title = raw.trim();
  let season = null;
  let episode = null;
  let isMovie = false;

  // Pattern 1: مسلسل Show Name الموسم X الحلقة Y مترجمة
  let m = title.match(/^مسلسل\s+(.+?)\s+الموسم\s+(\S+)\s+الحلقة\s+(\d+)\s*(.*)$/);
  if (m) {
    let show = m[1].trim();
    let rawSeason = m[2].trim();
    season = arabicWordToNum(rawSeason);
    episode = m[3];
    return {
      english: `${show} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`,
      show,
      season,
      episode,
      isMovie: false,
      clean: title,
    };
  }

  // Pattern 2: انمي Show Name الحلقة Y مترجمة
  m = title.match(/^انمي\s+(.+?)\s+الحلقة\s+(\d+)\s*(.*)$/);
  if (m) {
    let show = m[1].trim();
    episode = m[2];
    return {
      english: `${show} E${String(episode).padStart(2, '0')}`,
      show,
      season: null,
      episode,
      isMovie: false,
      clean: title,
    };
  }

  // Pattern 3: مشاهدة فيلم Movie Name YEAR مترجم
  m = title.match(/^مشاهدة فيلم\s+(.+?)\s+(\d{4})\s*(.*)$/);
  if (m) {
    let movie = m[1].trim();
    let year = m[2];
    isMovie = true;
    return {
      english: `${movie} (${year})`,
      show: movie,
      season: null,
      episode: null,
      isMovie: true,
      clean: title,
      year,
    };
  }

  // Pattern 4: فيلم Movie Name YEAR
  m = title.match(/^فيلم\s+(.+?)\s+(\d{4})\s*(.*)$/);
  if (m) {
    let movie = m[1].trim();
    let year = m[2];
    isMovie = true;
    return {
      english: `${movie} (${year})`,
      show: movie,
      season: null,
      episode: null,
      isMovie: true,
      clean: title,
      year,
    };
  }

  // Pattern 5: مسلسل Show Name الموسم X مترجم كامل (season page)
  m = title.match(/^مسلسل\s+(.+?)\s+الموسم\s+(\S+)\s*(.*)$/);
  if (m) {
    let show = m[1].trim();
    let rawSeason = m[2].trim();
    season = arabicWordToNum(rawSeason);
    return {
      english: `${show} S${String(season).padStart(2, '0')}`,
      show,
      season,
      episode: null,
      isMovie: false,
      clean: title,
    };
  }

  // Pattern 6: Program Name Season N Episode N
  m = title.match(/^(.+?)\s+Season\s+(\d+)\s+Episode\s+(\d+)/i);
  if (m) {
    let show = m[1].trim();
    season = m[2];
    episode = m[3];
    return {
      english: `${show} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`,
      show,
      season,
      episode,
      isMovie: false,
      clean: title,
    };
  }

  // Fallback: strip common Arabic words
  let cleaned = title
    .replace(/^(مشاهدة|تحميل|مسلسل|انمي|فيلم|برنامج)\s+/i, '')
    .replace(/\s+(مترجمة|مترجم|مدبلجة|مدبلج|كاملة|كامل|اونلاين|اون لاين|الجودة|الجديد|القديم)\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    english: cleaned || title,
    show: cleaned || title,
    season: null,
    episode: null,
    isMovie: false,
    clean: title,
  };
}

function extractEpisodeNum(title, url) {
  // Try extracting from URL first: s01e10 or e1168
  let m = url.match(/[sS](\d+)[eE](\d+)/);
  if (m) return { season: m[1], episode: m[2] };
  m = url.match(/[eE](\d+)/);
  if (m) return { season: null, episode: m[1] };

  // Fallback to title parsing
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
