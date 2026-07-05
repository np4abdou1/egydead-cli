import { TextRenderable, BoxRenderable } from '@opentui/core';
import { getHistory, clearHistory } from '../history.js';

function createHistoryView(renderer) {
  const container = new BoxRenderable(renderer, {
    id: 'hist-container',
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    padding: 1,
  });

  const header = new TextRenderable(renderer, {
    id: 'hist-header',
    content: ' Continue Watching',
    fg: '#00FF00',
    bold: true,
  });

  const listContainer = new BoxRenderable(renderer, {
    id: 'hist-list',
    width: '100%',
    flexGrow: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  });

  const footer = new TextRenderable(renderer, {
    id: 'hist-footer',
    content: '',
    fg: '#555555',
  });

  container.add(header);
  container.add(listContainer);
  container.add(footer);

  let entries = [];
  let selectedIndex = 0;
  let itemRenderables = [];

  function buildList() {
    for (const r of itemRenderables) {
      listContainer.remove(r);
    }
    itemRenderables = [];

    entries = getHistory();

    if (entries.length === 0) {
      const empty = new TextRenderable(renderer, {
        id: 'hist-empty',
        content: ' No history yet. Watch something first!',
        fg: '#FF8800',
      });
      listContainer.add(empty);
      itemRenderables.push(empty);
      footer.content = ' [b] Back  [q] Quit';
      return;
    }

    footer.content = ' [j/k] Navigate  [Enter] Resume  [c] Clear All  [b] Back  [q] Quit';

    selectedIndex = 0;
    entries.forEach((e, i) => {
      const prefix = i === 0 ? ' > ' : '   ';
      const date = new Date(e.timestamp).toLocaleDateString();
      const text = new TextRenderable(renderer, {
        id: 'hist-item-' + i,
        content: prefix + (e.english || e.title).substring(0, 70) + '  (' + date + ')',
        fg: i === 0 ? '#00FF00' : '#CCCCCC',
      });
      listContainer.add(text);
      itemRenderables.push(text);
    });
  }

  function moveSelection(delta) {
    if (entries.length === 0) return;
    const old = selectedIndex;
    selectedIndex = Math.max(0, Math.min(entries.length - 1, selectedIndex + delta));
    if (old === selectedIndex) return;

    const updateItem = (idx, isSelected) => {
      if (!itemRenderables[idx]) return;
      const prefix = isSelected ? ' > ' : '   ';
      const date = new Date(entries[idx].timestamp).toLocaleDateString();
      itemRenderables[idx].content = prefix + (entries[idx].english || entries[idx].title).substring(0, 70) + '  (' + date + ')';
      itemRenderables[idx].fg = isSelected ? '#00FF00' : '#CCCCCC';
    };

    updateItem(old, false);
    updateItem(selectedIndex, true);
  }

  function getSelected() {
    return entries.length > 0 ? entries[selectedIndex] : null;
  }

  function doClear() {
    clearHistory();
    buildList();
  }

  const cleanup = () => {
    renderer.root.remove(container);
  };

  return { container, cleanup, buildList, moveSelection, getSelected, doClear };
}

export { createHistoryView };
