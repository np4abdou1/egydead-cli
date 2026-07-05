import { TextRenderable, BoxRenderable } from '@opentui/core';

function createResultsView(renderer, state) {
  const container = new BoxRenderable(renderer, {
    id: 'results-container',
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    padding: 1,
  });

  const header = new TextRenderable(renderer, {
    id: 'results-header',
    content: '',
    fg: '#00FF00',
    bold: true,
  });

  const listContainer = new BoxRenderable(renderer, {
    id: 'results-list',
    width: '100%',
    flexGrow: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  });

  const footer = new TextRenderable(renderer, {
    id: 'results-footer',
    content: '',
    fg: '#555555',
  });

  container.add(header);
  container.add(listContainer);
  container.add(footer);

  let items = [];
  let selectedIndex = 0;
  let itemRenderables = [];

  function buildList(results) {
    // Clear old items
    for (const r of itemRenderables) {
      listContainer.remove(r);
    }
    itemRenderables = [];
    items = results;

    if (!results || results.length === 0) {
      const empty = new TextRenderable(renderer, {
        id: 'results-empty',
        content: ' No results found.',
        fg: '#FF8800',
      });
      listContainer.add(empty);
      itemRenderables.push(empty);
      header.content = ' Results for "' + (state.query || '') + '"';
      footer.content = ' [b] Back  [q] Quit';
      return;
    }

    const q = state.query || '';
    header.content = ' Results for "' + q + '"  (' + results.length + ' found)';
    footer.content = ' [j/k] Navigate  [Enter] Select  [b] Back  [q] Quit';

    selectedIndex = 0;
    results.forEach((r, i) => {
      const prefix = i === selectedIndex ? ' > ' : '   ';
      const num = String(i + 1).padStart(2, ' ');
      const text = new TextRenderable(renderer, {
        id: 'result-' + i,
        content: prefix + num + '. ' + r.title + ' (' + r.category + ')',
        fg: i === selectedIndex ? '#00FF00' : '#CCCCCC',
      });
      listContainer.add(text);
      itemRenderables.push(text);
    });
  }

  function moveSelection(delta) {
    if (items.length === 0) return;
    const oldIdx = selectedIndex;
    selectedIndex = Math.max(0, Math.min(items.length - 1, selectedIndex + delta));
    if (oldIdx === selectedIndex) return;

    // Update visual
    const oldPrefix = oldIdx === selectedIndex ? ' > ' : '   ';
    const newPrefix = ' > ';

    if (itemRenderables[oldIdx]) {
      itemRenderables[oldIdx].content = oldPrefix + String(oldIdx + 1).padStart(2, ' ') + '. ' + items[oldIdx].title + ' (' + items[oldIdx].category + ')';
      itemRenderables[oldIdx].fg = '#CCCCCC';
    }
    if (itemRenderables[selectedIndex]) {
      itemRenderables[selectedIndex].content = newPrefix + String(selectedIndex + 1).padStart(2, ' ') + '. ' + items[selectedIndex].title + ' (' + items[selectedIndex].category + ')';
      itemRenderables[selectedIndex].fg = '#00FF00';
    }
  }

  function getSelected() {
    return items.length > 0 ? items[selectedIndex] : null;
  }

  const cleanup = () => {
    renderer.root.remove(container);
  };

  return { container, cleanup, buildList, moveSelection, getSelected };
}

export { createResultsView };
