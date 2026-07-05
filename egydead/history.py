import json
import os
from pathlib import Path
from typing import Optional

HISTORY_DIR = Path.home() / '.config' / 'egydead'
HISTORY_FILE = HISTORY_DIR / 'history.json'
MAX_ENTRIES = 50


def _ensure_dir():
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)


def _load() -> list:
    try:
        _ensure_dir()
        if not HISTORY_FILE.exists():
            return []
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _save(entries: list):
    _ensure_dir()
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)


def add_entry(entry: dict) -> list:
    entries = _load()
    entries = [e for e in entries if e.get('url') != entry.get('url')]
    entries.insert(0, {
        'title': entry.get('title', ''),
        'english': entry.get('english', entry.get('title', '')),
        'show': entry.get('show', entry.get('title', '')),
        'season': entry.get('season'),
        'episode': entry.get('episode'),
        'url': entry.get('url', ''),
        'category': entry.get('category', ''),
        'timestamp': __import__('time').time(),
    })
    if len(entries) > MAX_ENTRIES:
        entries = entries[:MAX_ENTRIES]
    _save(entries)
    return entries


def get_history() -> list:
    return _load()


def clear_history() -> list:
    _save([])
    return []


def remove_entry(url: str) -> list:
    entries = _load()
    entries = [e for e in entries if e.get('url') != url]
    _save(entries)
    return entries
