import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const HISTORY_DIR = join(homedir(), '.config', 'egydead');
const HISTORY_FILE = join(HISTORY_DIR, 'history.json');
const MAX_ENTRIES = 50;

function ensureDir() {
  if (!existsSync(HISTORY_DIR)) {
    mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

function load() {
  try {
    ensureDir();
    if (!existsSync(HISTORY_FILE)) return [];
    const data = readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function save(entries) {
  ensureDir();
  writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

function addEntry(entry) {
  let entries = load();

  // Remove duplicate URL
  entries = entries.filter(e => e.url !== entry.url);

  // Add to front
  entries.unshift({
    title: entry.title,
    english: entry.english || entry.title,
    show: entry.show || entry.title,
    season: entry.season || null,
    episode: entry.episode || null,
    url: entry.url,
    category: entry.category || '',
    timestamp: Date.now(),
  });

  // Trim to max
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(0, MAX_ENTRIES);
  }

  save(entries);
  return entries;
}

function getHistory() {
  return load();
}

function clearHistory() {
  save([]);
  return [];
}

function removeEntry(url) {
  let entries = load();
  entries = entries.filter(e => e.url !== url);
  save(entries);
  return entries;
}

export { addEntry, getHistory, clearHistory, removeEntry };
