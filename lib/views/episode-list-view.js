import { TextRenderable, BoxRenderable } from '@opentui/core';

function createEpisodeListView(renderer, state) {
  const container = new BoxRenderable(renderer, {
    id: 'ep-container',
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    padding: 1,
  });

  const header = new TextRenderable(renderer, {
    id: 'ep-header',
    content: '',
    fg: '#00FF00',
    bold: true,
  });

  const listContainer = new BoxRenderable(renderer, {
    id: 'ep-list',
    width: '100%',
    flexGrow: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  });

  const footer = new TextRenderable(renderer, {
    id: 'ep-footer',
    content: '',
    fg: '#555555',
  });

  container.add(header);
  container.add(listContainer);
  container.add(footer);

  let episodes = [];
  let selectedIndex = 0;
  let itemRenderables = [];

  function buildList(eps) {
    for (const r of itemRenderables) {
      listContainer.remove(r);
    }
    itemRenderables = [];
    episodes = eps;

    if (!eps || eps.length === 0) {
      const empty = new TextRenderable(renderer, {
        id: 'ep-empty',
        content: ' No episodes available.',
        fg: '#FF8800',
      });
      listContainer.add(empty);
      itemRenderables.push(empty);
      header.content = ' Episodes';
      footer.content = ' [b] Back  [q] Quit';
      return;
    }

    header.content = ' Episodes (' + eps.length + ' total)';
    footer.content = ' [j/k] Navigate  [Enter] Select  [b] Back  [q] Quit';

    selectedIndex = 0;
    eps.forEach((e, i) => {
      const prefix = i === 0 ? ' > ' : '   ';
      const num = String(i + 1).padStart(2, ' ');
      const text = new TextRenderable(renderer, {
        id: 'ep-item-' + i,
        content: prefix + num + '. ' + e.title.substring(0, 80),
        fg: i === 0 ? '#00FF00' : '#CCCCCC',
      });
      listContainer.add(text);
      itemRenderables.push(text);
    });
  }

  function moveSelection(delta) {
    if (episodes.length === 0) return;
    const old = selectedIndex;
    selectedIndex = Math.max(0, Math.min(episodes.length - 1, selectedIndex + delta));
    if (old === selectedIndex) return;

    const updateItem = (idx, isSelected) => {
      if (!itemRenderables[idx]) return;
      const prefix = isSelected ? ' > ' : '   ';
      itemRenderables[idx].content = prefix + String(idx + 1).padStart(2, ' ') + '. ' + episodes[idx].title.substring(0, 80);
      itemRenderables[idx].fg = isSelected ? '#00FF00' : '#CCCCCC';
    };

    updateItem(old, false);
    updateItem(selectedIndex, true);
  }

  function getSelected() {
    return episodes.length > 0 ? episodes[selectedIndex] : null;
  }

  const cleanup = () => {
    renderer.root.remove(container);
  };

  return { container, cleanup, buildList, moveSelection, getSelected };
}

export { createEpisodeListView };
