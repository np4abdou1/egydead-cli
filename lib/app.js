import { createCliRenderer } from '@opentui/core';
import { spawn } from 'child_process';
import { search } from './search.js';
import { resolve, deepResolveDownload } from './resolve.js';
import { parseTitle, extractEpisodeNum, incrementEpisode } from './title.js';
import { addEntry, getHistory } from './history.js';
import { createSearchView } from './views/search-view.js';
import { createResultsView } from './views/results-view.js';
import { createContentView } from './views/content-view.js';
import { createEpisodeListView } from './views/episode-list-view.js';
import { createHistoryView } from './views/history-view.js';

const Views = {
  SEARCH: 'search',
  RESULTS: 'results',
  CONTENT: 'content',
  EPISODES: 'episodes',
  HISTORY: 'history',
};

async function startTUI() {
  const renderer = await createCliRenderer();

  const state = {
    query: '',
    currentView: Views.SEARCH,
    viewStack: [],
    data: null,
    currentItem: null,
    resolveCache: new Map(),
  };

  let activeView = null;
  let searchView, resultsView, contentView, episodeView, historyView;
  let currentInput = '';
  let typingMode = true;

  function switchView(newView) {
    if (activeView && activeView.cleanup) {
      activeView.cleanup();
    }
    activeView = null;

    switch (newView) {
      case Views.SEARCH: {
        searchView = createSearchView(renderer, state);
        renderer.root.add(searchView.container);
        activeView = searchView;
        typingMode = true;
        currentInput = state.query || '';
        break;
      }
      case Views.RESULTS: {
        resultsView = createResultsView(renderer, state);
        renderer.root.add(resultsView.container);
        activeView = resultsView;
        typingMode = false;
        break;
      }
      case Views.CONTENT: {
        contentView = createContentView(renderer, state);
        renderer.root.add(contentView.container);
        activeView = contentView;
        typingMode = false;
        break;
      }
      case Views.EPISODES: {
        episodeView = createEpisodeListView(renderer, state);
        renderer.root.add(episodeView.container);
        activeView = episodeView;
        typingMode = false;
        break;
      }
      case Views.HISTORY: {
        historyView = createHistoryView(renderer);
        renderer.root.add(historyView.container);
        activeView = historyView;
        typingMode = false;
        historyView.buildList();
        break;
      }
    }

    state.currentView = newView;
  }

  async function doSearch(query) {
    state.query = query;
    state.viewStack.push(Views.SEARCH);
    switchView(Views.RESULTS);
    try {
      const results = await search(query, 20);
      resultsView.buildList(results);
    } catch (err) {
      resultsView.buildList([]);
    }
  }

  async function doResolve(item) {
    state.currentItem = item;
    state.viewStack.push(state.currentView);

    // Check cache
    if (state.resolveCache.has(item.url)) {
      state.data = state.resolveCache.get(item.url);
    } else {
      try {
        state.data = await resolve(item.url);
        state.resolveCache.set(item.url, state.data);
      } catch (err) {
        state.data = { title: 'Error: ' + err.message, servers: [], downloads: [], episodes: [] };
      }
    }

    const parsed = parseTitle(state.data.title);
    const englishTitle = parsed.english;

    // Add to history
    addEntry({
      title: state.data.title,
      english: englishTitle,
      show: parsed.show,
      season: parsed.season,
      episode: parsed.episode,
      url: item.url,
      category: item.category || '',
    });

    switchView(Views.CONTENT);
    contentView.displayContent(state.data, englishTitle);
  }

  async function doPlay(url) {
    try {
      const proc = spawn('mpv', [url], {
        stdio: 'ignore',
        detached: true,
      });
      proc.unref();
    } catch {
      // mpv not found - ignore
    }
  }

  async function doNextEpisode() {
    if (!state.data || !state.data.episodes || state.data.episodes.length === 0) {
      return;
    }

    const epInfo = extractEpisodeNum(state.data.title, state.currentItem?.url || state.data.url);
    if (!epInfo.episode) return;

    const next = incrementEpisode(epInfo.season, epInfo.episode);
    if (!next) return;

    // Find next episode in the episodes list
    const nextEpStr = 's' + next.season + 'e' + next.episode;
    const nextEp = state.data.episodes.find(e => {
      const urlLower = e.url.toLowerCase();
      return urlLower.includes(nextEpStr) || urlLower.includes('e' + next.episode);
    });

    if (nextEp) {
      await doResolve(nextEp);
    }
  }

  function goBack() {
    const prev = state.viewStack.pop();
    if (prev) {
      switchView(prev);
    }
  }

  async function showHistory() {
    state.viewStack.push(state.currentView);
    switchView(Views.HISTORY);
    historyView.buildList();
  }

  // ----- Keyboard handling -----
  renderer.keyInput.on('keypress', async (key) => {
    const view = state.currentView;

    // Global keys
    if (key.name === 'q' && !typingMode) {
      renderer.destroy();
      return;
    }

    // Search view (typing mode)
    if (view === Views.SEARCH) {
      if (key.name === 'enter') {
        const query = currentInput.trim();
        if (query.length > 0) {
          state.query = query;
          await doSearch(query);
        }
        return;
      }
      if (key.name === 'escape') {
        renderer.destroy();
        return;
      }
      if (key.name === 'backspace' && currentInput.length > 0) {
        currentInput = currentInput.slice(0, -1);
        searchView.updateQuery(currentInput);
        return;
      }
      if (key.name === 'h') {
        await showHistory();
        return;
      }
      if (key.name.length === 1 && key.name !== 'h') {
        currentInput += key.name;
        searchView.updateQuery(currentInput);
        return;
      }
      return;
    }

    // Results view
    if (view === Views.RESULTS) {
      if (key.name === 'b' || key.name === 'escape') {
        goBack();
        return;
      }
      if (key.name === 'j' || key.name === 'down') {
        resultsView.moveSelection(1);
        return;
      }
      if (key.name === 'k' || key.name === 'up') {
        resultsView.moveSelection(-1);
        return;
      }
      if (key.name === 'enter') {
        const selected = resultsView.getSelected();
        if (selected) {
          await doResolve(selected);
        }
        return;
      }
      if (key.name === 'h') {
        await showHistory();
        return;
      }
      return;
    }

    // Content view
    if (view === Views.CONTENT) {
      if (key.name === 'b' || key.name === 'escape') {
        goBack();
        return;
      }
      if (key.name === 'e' && state.data && state.data.episodes && state.data.episodes.length > 0) {
        state.viewStack.push(Views.CONTENT);
        switchView(Views.EPISODES);
        episodeView.buildList(state.data.episodes);
        return;
      }
      if (key.name === 'p') {
        // Play first download
        const downloads = state.data?.downloads || [];
        const targets = downloads.filter(d => d.url.includes('sfile.sbs') || d.url.match(/\.mp4$/));
        if (targets.length > 0) {
          doPlay(targets[0].url);
        }
        return;
      }
      if (key.name === 'n') {
        await doNextEpisode();
        return;
      }
      if (key.name === 'h') {
        await showHistory();
        return;
      }
      return;
    }

    // Episodes view
    if (view === Views.EPISODES) {
      if (key.name === 'b' || key.name === 'escape') {
        goBack();
        return;
      }
      if (key.name === 'j' || key.name === 'down') {
        episodeView.moveSelection(1);
        return;
      }
      if (key.name === 'k' || key.name === 'up') {
        episodeView.moveSelection(-1);
        return;
      }
      if (key.name === 'enter') {
        const selected = episodeView.getSelected();
        if (selected) {
          await doResolve(selected);
        }
        return;
      }
      if (key.name === 'h') {
        await showHistory();
        return;
      }
      return;
    }

    // History view
    if (view === Views.HISTORY) {
      if (key.name === 'b' || key.name === 'escape') {
        goBack();
        return;
      }
      if (key.name === 'j' || key.name === 'down') {
        historyView.moveSelection(1);
        return;
      }
      if (key.name === 'k' || key.name === 'up') {
        historyView.moveSelection(-1);
        return;
      }
      if (key.name === 'enter') {
        const selected = historyView.getSelected();
        if (selected) {
          state.currentItem = { title: selected.title, url: selected.url, category: selected.category || '' };
          await doResolve(state.currentItem);
        }
        return;
      }
      if (key.name === 'c') {
        historyView.doClear();
        return;
      }
      return;
    }
  });

  // Start with search view
  switchView(Views.SEARCH);

  return renderer;
}

export { startTUI };
