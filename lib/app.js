import { createCliRenderer, BoxRenderable, TextRenderable, InputRenderable, SelectRenderable } from '@opentui/core';
import { spawn } from 'child_process';
import { search } from './search.js';
import { resolve, deepResolveDownload } from './resolve.js';
import { parseTitle, extractEpisodeNum, incrementEpisode } from './title.js';
import { addEntry, getHistory, clearHistory } from './history.js';

const Views = { SEARCH: 0, RESULTS: 1, CONTENT: 2, EPISODES: 3, HISTORY: 4 };

async function startTUI() {
  const renderer = await createCliRenderer();
  const viewStack = [];
  let currentView = Views.SEARCH;

  // Persistent root container
  const root = new BoxRenderable(renderer, {
    id: 'root',
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    padding: 1,
  });
  renderer.root.add(root);

  // Status bar (always visible)
  const statusBar = new TextRenderable(renderer, {
    id: 'status',
    content: '',
    fg: '#555555',
  });
  root.add(statusBar);

  // Content area (swap views here)
  const contentArea = new BoxRenderable(renderer, {
    id: 'content',
    width: '100%',
    flexGrow: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  });
  root.add(contentArea);

  let currentWidgets = [];
  let widgetIds = new Set();

  function clearContent() {
    for (const id of widgetIds) {
      contentArea.remove(id);
    }
    currentWidgets = [];
    widgetIds.clear();
  }

  function addWidget(w) {
    if (w.id) widgetIds.add(w.id);
    contentArea.add(w);
    currentWidgets.push(w);
  }

  function setStatus(msg) {
    statusBar.content = ' ' + msg;
  }

  // ---- Search View ----
  function showSearch() {
    clearContent();
    currentView = Views.SEARCH;

    const title = new TextRenderable(renderer, {
      id: 's-title',
      content: ' EgyDead CLI - Search Movies & Series',
      fg: '#00FF00',
      bold: true,
    });
    addWidget(title);

    const input = new InputRenderable(renderer, {
      id: 's-input',
      width: '100%',
      border: true,
      borderStyle: 'rounded',
      borderFg: '#00FF00',
      padding: 1,
      placeholder: 'Type search query and press Enter...',
      fg: '#FFFFFF',
    });
    addWidget(input);

    // Spacer
    const spacer = new TextRenderable(renderer, { id: 's-spacer', content: '', flexGrow: 1 });
    addWidget(spacer);

    setStatus('[Enter] Search  [q] Quit');
    input.focus();

    // Listen for Enter on input
    input.on('enter', async () => {
      const query = input.value.trim();
      if (!query) return;
      doSearch(query);
    });
  }

  // ---- Results View ----
  function showResults(results, query) {
    clearContent();
    currentView = Views.RESULTS;

    const header = new TextRenderable(renderer, {
      id: 'r-header',
      content: ' Results for "' + query + '"  (' + results.length + ' found)',
      fg: '#00FF00',
      bold: true,
    });
    addWidget(header);

    const options = results.map((r, i) => ({
      name: (i + 1) + '. ' + parseTitle(r.title).english,
      description: r.category,
      value: r,
    }));

    const list = new SelectRenderable(renderer, {
      id: 'r-list',
      width: '100%',
      flexGrow: 1,
      options,
      selectedBackgroundColor: '#00FF00',
      selectedTextColor: '#000000',
      textColor: '#CCCCCC',
      focusedTextColor: '#FFFFFF',
      showDescription: true,
      descriptionColor: '#888888',
      selectedDescriptionColor: '#000000',
      itemSpacing: 0,
    });
    addWidget(list);

    setStatus('[↑/↓] Navigate  [Enter] Select  [b] Back  [q] Quit');

    list.on('itemSelected', (ev) => {
      const sel = list.getSelectedOption();
      if (sel && sel.value) {
        viewStack.push(Views.RESULTS);
        resolveAndShow(sel.value);
      }
    });
  }

  // ---- Content View ----
  function showContent(data, englishTitle) {
    clearContent();
    currentView = Views.CONTENT;

    const title = new TextRenderable(renderer, {
      id: 'c-title',
      content: ' ' + (englishTitle || data.title),
      fg: '#00FF00',
      bold: true,
    });
    addWidget(title);

    const body = new BoxRenderable(renderer, {
      id: 'c-body',
      width: '100%',
      flexGrow: 1,
      flexDirection: 'column',
      overflow: 'scroll',
    });
    addWidget(body);

    // Servers
    if (data.servers && data.servers.length > 0) {
      const srvH = new TextRenderable(renderer, {
        id: 'c-srv-h',
        content: ' Streaming Servers (' + data.servers.length + '):',
        fg: '#FFAA00',
        bold: true,
      });
      body.add(srvH);
      data.servers.forEach((s, i) => {
        body.add(new TextRenderable(renderer, {
          id: 'c-srv-' + i,
          content: '   ' + (i + 1) + '. ' + s.name,
          fg: '#AAAAAA',
        }));
      });
    }

    // Downloads
    if (data.downloads && data.downloads.length > 0) {
      const dlH = new TextRenderable(renderer, {
        id: 'c-dl-h',
        content: ' Downloads (' + data.downloads.length + '):',
        fg: '#FFAA00',
        bold: true,
      });
      body.add(dlH);
      data.downloads.forEach((d, i) => {
        body.add(new TextRenderable(renderer, {
          id: 'c-dl-' + i,
          content: '   ' + (i + 1) + '. [' + d.quality + '] ' + d.name,
          fg: '#AAAAAA',
        }));
      });
    }

    // Episodes
    if (data.episodes && data.episodes.length > 0) {
      const epH = new TextRenderable(renderer, {
        id: 'c-ep-h',
        content: ' Episodes (' + data.episodes.length + '):',
        fg: '#FFAA00',
        bold: true,
      });
      body.add(epH);
      data.episodes.forEach((e, i) => {
        body.add(new TextRenderable(renderer, {
          id: 'c-ep-' + i,
          content: '   ' + (i + 1) + '. ' + parseTitle(e.title).english.substring(0, 60),
          fg: '#AAAAAA',
        }));
      });
    }

    if ((!data.servers || data.servers.length === 0) &&
        (!data.downloads || data.downloads.length === 0) &&
        (!data.episodes || data.episodes.length === 0)) {
      body.add(new TextRenderable(renderer, {
        id: 'c-nodata',
        content: ' No servers, downloads, or episodes found.',
        fg: '#FF4444',
      }));
    }

    let s = '[b] Back';
    if (data.episodes && data.episodes.length > 0) s += '  [e] Episodes';
    s += '  [p] Play  [n] Next Ep  [q] Quit';
    setStatus(s);
  }

  // ---- Episode List View ----
  function showEpisodeList(episodes) {
    clearContent();
    currentView = Views.EPISODES;

    const header = new TextRenderable(renderer, {
      id: 'e-header',
      content: ' Episodes (' + episodes.length + '):',
      fg: '#00FF00',
      bold: true,
    });
    addWidget(header);

    const options = episodes.map((e, i) => ({
      name: (i + 1) + '. ' + parseTitle(e.title).english.substring(0, 70),
      description: '',
      value: e,
    }));

    const list = new SelectRenderable(renderer, {
      id: 'e-list',
      width: '100%',
      flexGrow: 1,
      options,
      selectedBackgroundColor: '#00FF00',
      selectedTextColor: '#000000',
      textColor: '#CCCCCC',
      focusedTextColor: '#FFFFFF',
      showDescription: false,
      itemSpacing: 0,
    });
    addWidget(list);

    setStatus('[↑/↓] Navigate  [Enter] Select  [b] Back  [q] Quit');

    list.on('itemSelected', () => {
      const sel = list.getSelectedOption();
      if (sel && sel.value) {
        viewStack.push(Views.EPISODES);
        resolveAndShow(sel.value);
      }
    });
  }

  // ---- History View ----
  function showHistory() {
    clearContent();
    currentView = Views.HISTORY;

    const header = new TextRenderable(renderer, {
      id: 'h-header',
      content: ' Continue Watching',
      fg: '#00FF00',
      bold: true,
    });
    addWidget(header);

    const entries = getHistory();
    if (entries.length === 0) {
      addWidget(new TextRenderable(renderer, {
        id: 'h-empty',
        content: ' No history yet. Watch something first!',
        fg: '#FF8800',
      }));
      setStatus('[b] Back  [q] Quit');
      return;
    }

    const options = entries.map((e, i) => ({
      name: (e.english || e.title).substring(0, 70),
      description: new Date(e.timestamp).toLocaleDateString(),
      value: e,
    }));

    const list = new SelectRenderable(renderer, {
      id: 'h-list',
      width: '100%',
      flexGrow: 1,
      options,
      selectedBackgroundColor: '#00FF00',
      selectedTextColor: '#000000',
      textColor: '#CCCCCC',
      focusedTextColor: '#FFFFFF',
      showDescription: true,
      descriptionColor: '#888888',
      selectedDescriptionColor: '#000000',
      itemSpacing: 0,
    });
    addWidget(list);

    setStatus('[↑/↓] Navigate  [Enter] Resume  [c] Clear  [b] Back  [q] Quit');

    list.on('itemSelected', () => {
      const sel = list.getSelectedOption();
      if (sel && sel.value) {
        viewStack.push(Views.HISTORY);
        resolveAndShow({ title: sel.value.title, url: sel.value.url, category: sel.value.category || '' });
      }
    });
  }

  // ---- Core Actions ----
  let cachedData = null;
  let cachedItem = null;
  let cachedResults = [];
  let cachedQuery = '';

  async function doSearch(query) {
    setStatus(' Searching...');
    try {
      const results = await search(query, 20);
      cachedResults = results;
      cachedQuery = query;
      viewStack.push(Views.SEARCH);
      showResults(results, query);
    } catch (err) {
      setStatus(' Search failed: ' + err.message);
      showSearch();
    }
  }

  async function resolveAndShow(item) {
    cachedItem = item;
    setStatus(' Resolving...');

    try {
      const data = await resolve(item.url);
      cachedData = data;
      const parsed = parseTitle(data.title);
      const english = parsed.english;

      addEntry({
        title: data.title,
        english,
        show: parsed.show,
        season: parsed.season,
        episode: parsed.episode,
        url: item.url,
        category: item.category || '',
      });

      showContent(data, english);
    } catch (err) {
      setStatus(' Failed: ' + err.message);
    }
  }

  function goBack() {
    const prev = viewStack.pop();
    if (prev === undefined) return;
    switch (prev) {
      case Views.SEARCH: showSearch(); break;
      case Views.RESULTS:
        if (cachedResults.length > 0) showResults(cachedResults, cachedQuery);
        else showSearch();
        break;
      case Views.CONTENT:
        if (cachedData) showContent(cachedData, parseTitle(cachedData.title).english);
        else showSearch();
        break;
      case Views.EPISODES:
        if (cachedData && cachedData.episodes) showEpisodeList(cachedData.episodes);
        else showSearch();
        break;
      case Views.HISTORY: showHistory(); break;
    }
  }

  function doPlay() {
    if (!cachedData) return;
    const targets = cachedData.downloads.filter(d => d.url.includes('sfile.sbs') || d.url.match(/\.mp4$/));
    if (targets.length === 0) {
      setStatus(' No playable URL found.');
      return;
    }
    try {
      const proc = spawn('mpv', [targets[0].url], { stdio: 'ignore', detached: true });
      proc.unref();
      setStatus(' mpv launched: ' + targets[0].name);
    } catch {
      setStatus(' mpv not found. Install mpv to play.');
    }
  }

  function doNextEpisode() {
    if (!cachedData || !cachedData.episodes || cachedData.episodes.length === 0) return;
    const epInfo = extractEpisodeNum(cachedData.title, cachedItem?.url || '');
    if (!epInfo.episode) return;
    const next = incrementEpisode(epInfo.season, epInfo.episode);
    if (!next) return;
    const nextStr = 's' + next.season?.padStart(2, '0') + 'e' + next.episode;
    const nextEp = cachedData.episodes.find(e => {
      const u = e.url.toLowerCase();
      return u.includes(nextStr) || u.includes('e' + next.episode);
    });
    if (nextEp) {
      resolveAndShow(nextEp);
    } else {
      setStatus(' No next episode found.');
    }
  }

  // ---- Global Keyboard Handler ----
  renderer.keyInput.on('keypress', (key) => {
    if (key.name === 'q') {
      renderer.destroy();
      return;
    }

    if (key.name === 'b' || key.name === 'escape') {
      if (currentView !== Views.SEARCH) {
        goBack();
      }
      return;
    }

    if (currentView === Views.CONTENT) {
      if (key.name === 'p') { doPlay(); return; }
      if (key.name === 'n') { doNextEpisode(); return; }
      if (key.name === 'e' && cachedData && cachedData.episodes && cachedData.episodes.length > 0) {
        viewStack.push(Views.CONTENT);
        showEpisodeList(cachedData.episodes);
        return;
      }
    }

    if (currentView === Views.HISTORY && key.name === 'c') {
      clearHistory();
      showHistory();
      return;
    }

    if (key.name === 'h' && currentView !== Views.SEARCH) {
      viewStack.push(currentView);
      showHistory();
      return;
    }
  });

  // Start
  showSearch();
  return renderer;
}

export { startTUI };
