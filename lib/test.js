import { parseTitle, extractEpisodeNum, incrementEpisode } from './title.js';
import { addEntry, getHistory, clearHistory, removeEntry } from './history.js';

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed++;
    console.log('  PASS: ' + name);
  } else {
    failed++;
    console.log('  FAIL: ' + name);
  }
}

// ===== Test 1: Title Parsing =====
console.log('\n=== Test 1: Title Parsing ===');

// Pattern 1: Series episode
let result = parseTitle('مسلسل The Testaments الموسم الاول الحلقة 10 مترجمة');
assert('Series episode: extracts English show name', result.show === 'The Testaments');
assert('Series episode: extracts season 1', result.season === '1');
assert('Series episode: extracts episode 10', result.episode === '10');
assert('Series episode: formatted english', result.english === 'The Testaments S01E10');
assert('Series episode: not a movie', result.isMovie === false);

// Pattern 2: Anime
result = parseTitle('انمي One Piece الحلقة 1168 مترجمة');
assert('Anime: extracts show name', result.show === 'One Piece');
assert('Anime: extracts episode 1168', result.episode === '1168');
assert('Anime: formatted english', result.english === 'One Piece E1168');

// Pattern 3: Movie with مشاهدة فيلم
result = parseTitle('مشاهدة فيلم Avatar 3 Fire and Ash 2025 مترجم');
assert('Movie (مشاهدة فيلم): extracts name', result.show === 'Avatar 3 Fire and Ash');
assert('Movie (مشاهدة فيلم): isMovie true', result.isMovie === true);
assert('Movie (مشاهدة فيلم): year present', result.year === '2025');

// Pattern 4: Movie with فيلم
result = parseTitle('فيلم Shelter 2026 مترجم');
assert('Movie (فيلم): extracts name', result.show === 'Shelter');
assert('Movie (فيلم): isMovie true', result.isMovie === true);
assert('Movie (فيلم): year 2026', result.year === '2026');

// Pattern 5: Season page
result = parseTitle('مسلسل The Testaments الموسم الاول مترجم كامل');
assert('Season page: extracts show name', result.show === 'The Testaments');
assert('Season page: extracts season 1', result.season === '1');
assert('Season page: no episode', result.episode === null);

// Pattern 6: English season/episode
result = parseTitle('The Testaments Season 1 Episode 10');
assert('English pattern: extracts show', result.show === 'The Testaments');
assert('English pattern: season 1', result.season === '1');
assert('English pattern: episode 10', result.episode === '10');

// extractEpisodeNum
result = extractEpisodeNum('مسلسل The Testaments الموسم الاول الحلقة 10', 'https://tv9.egydead.live/episode/the-testaments-s01e10');
assert('extractEpisodeNum from URL', result.season === '01' && result.episode === '10');

// incrementEpisode
result = incrementEpisode('1', '10');
assert('incrementEpisode: s01e11', result.season === '01' && result.episode === '11');

result = incrementEpisode(null, '5');
assert('incrementEpisode: no season, e06', result.season === null && result.episode === '06');

// ===== Test 2: History Operations =====
console.log('\n=== Test 2: History Operations ===');

clearHistory();
let hist = getHistory();
assert('History empty after clear', hist.length === 0);

addEntry({ title: 'Test Show', english: 'Test Show S01E01', url: '/test', category: 'series' });
hist = getHistory();
assert('History has 1 entry after add', hist.length === 1);
assert('History entry has correct title', hist[0].title === 'Test Show');
assert('History entry has timestamp', typeof hist[0].timestamp === 'number');

addEntry({ title: 'Movie 2025', english: 'Movie (2025)', url: '/movie', category: 'movies' });
hist = getHistory();
assert('History has 2 entries', hist.length === 2);
assert('Newest entry first', hist[0].url === '/movie');

// Duplicate URL replaces
addEntry({ title: 'Updated Show', english: 'Test Show S01E01', url: '/test', category: 'series' });
hist = getHistory();
assert('History still has 2 entries after update', hist.length === 2);
assert('Updated title for duplicate URL', hist[0].title === 'Updated Show');

removeEntry('/movie');
hist = getHistory();
assert('History has 1 after remove', hist.length === 1);

clearHistory();
hist = getHistory();
assert('History empty again', hist.length === 0);

// ===== Test 3: Headless CLI commands =====
console.log('\n=== Test 3: Headless CLI ===');

// We test that the modules export correctly
import { search } from './search.js';
import { resolve } from './resolve.js';
assert('search module exports function', typeof search === 'function');
assert('resolve module exports function', typeof resolve === 'function');

// ===== Summary =====
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
