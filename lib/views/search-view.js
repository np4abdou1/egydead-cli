import { TextRenderable, BoxRenderable } from '@opentui/core';

function createSearchView(renderer, state) {
  const container = new BoxRenderable(renderer, {
    id: 'search-container',
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    padding: 1,
  });

  const title = new TextRenderable(renderer, {
    id: 'search-title',
    content: ' EgyDead CLI - Search Movies & Series',
    fg: '#00FF00',
    bold: true,
  });

  const searchBox = new BoxRenderable(renderer, {
    id: 'search-box',
    width: '100%',
    height: 5,
    border: true,
    borderStyle: 'rounded',
    borderFg: '#00FF00',
    padding: 1,
    flexDirection: 'column',
  });

  const prompt = new TextRenderable(renderer, {
    id: 'search-prompt',
    content: ' Search: ' + (state.query || ''),
    fg: '#FFFFFF',
  });

  const hint = new TextRenderable(renderer, {
    id: 'search-hint',
    content: ' Type your query and press Enter to search | q: quit',
    fg: '#888888',
  });

  searchBox.add(prompt);
  searchBox.add(hint);

  const statusBar = new TextRenderable(renderer, {
    id: 'search-status',
    content: ' [Enter] Search  [h] History  [q] Quit',
    fg: '#555555',
  });

  container.add(title);
  container.add(searchBox);
  container.add(new TextRenderable(renderer, {
    id: 'search-spacer',
    content: '',
    flexGrow: 1,
  }));
  container.add(statusBar);

  function updateQuery(query) {
    state.query = query;
    prompt.content = ' Search: ' + query;
  }

  function getQuery() {
    return state.query || '';
  }

  const cleanup = () => {
    renderer.root.remove(container);
  };

  return { container, cleanup, updateQuery, getQuery };
}

export { createSearchView };
