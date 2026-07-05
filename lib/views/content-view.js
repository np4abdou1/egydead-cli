import { TextRenderable, BoxRenderable } from '@opentui/core';

function createContentView(renderer, state) {
  const container = new BoxRenderable(renderer, {
    id: 'content-container',
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    padding: 1,
  });

  const titleBar = new TextRenderable(renderer, {
    id: 'content-title',
    content: '',
    fg: '#00FF00',
    bold: true,
  });

  const body = new BoxRenderable(renderer, {
    id: 'content-body',
    width: '100%',
    flexGrow: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  });

  const footer = new TextRenderable(renderer, {
    id: 'content-footer',
    content: '',
    fg: '#555555',
  });

  container.add(titleBar);
  container.add(body);
  container.add(footer);

  let bodyRenderables = [];

  function clearBody() {
    for (const r of bodyRenderables) {
      body.remove(r);
    }
    bodyRenderables = [];
  }

  function displayContent(data, englishTitle) {
    clearBody();

    titleBar.content = ' ' + (englishTitle || data.title);

    // Servers section
    if (data.servers && data.servers.length > 0) {
      const srvHeader = new TextRenderable(renderer, {
        id: 'content-servers-header',
        content: ' Streaming Servers (' + data.servers.length + '):',
        fg: '#FFAA00',
        bold: true,
      });
      body.add(srvHeader);
      bodyRenderables.push(srvHeader);

      data.servers.forEach((s, i) => {
        const st = new TextRenderable(renderer, {
          id: 'content-server-' + i,
          content: '   ' + (i + 1) + '. ' + s.name + ' - ' + s.iframeUrl,
          fg: '#AAAAAA',
        });
        body.add(st);
        bodyRenderables.push(st);
      });
    }

    // Downloads section
    if (data.downloads && data.downloads.length > 0) {
      const dlHeader = new TextRenderable(renderer, {
        id: 'content-dl-header',
        content: ' Downloads (' + data.downloads.length + '):',
        fg: '#FFAA00',
        bold: true,
      });
      body.add(dlHeader);
      bodyRenderables.push(dlHeader);

      data.downloads.forEach((d, i) => {
        const dt = new TextRenderable(renderer, {
          id: 'content-dl-' + i,
          content: '   ' + (i + 1) + '. [' + d.quality + '] ' + d.name + ' - ' + d.url,
          fg: '#AAAAAA',
        });
        body.add(dt);
        bodyRenderables.push(dt);
      });
    }

    // Episodes section
    if (data.episodes && data.episodes.length > 0) {
      const epHeader = new TextRenderable(renderer, {
        id: 'content-ep-header',
        content: ' Episodes (' + data.episodes.length + '):',
        fg: '#FFAA00',
        bold: true,
      });
      body.add(epHeader);
      bodyRenderables.push(epHeader);

      data.episodes.forEach((e, i) => {
        const et = new TextRenderable(renderer, {
          id: 'content-ep-' + i,
          content: '   ' + (i + 1) + '. ' + e.title,
          fg: '#AAAAAA',
        });
        body.add(et);
        bodyRenderables.push(et);
      });
    }

    if ((!data.servers || data.servers.length === 0) &&
        (!data.downloads || data.downloads.length === 0) &&
        (!data.episodes || data.episodes.length === 0)) {
      const noData = new TextRenderable(renderer, {
        id: 'content-nodata',
        content: ' No servers, downloads, or episodes found.',
        fg: '#FF4444',
      });
      body.add(noData);
      bodyRenderables.push(noData);
    }

    let footerParts = ['[b] Back'];
    if (data.episodes && data.episodes.length > 0) footerParts.push('[e] Episodes');
    footerParts.push('[p] Play with mpv');
    footerParts.push('[q] Quit');
    footer.content = ' ' + footerParts.join('  |  ');
  }

  const cleanup = () => {
    renderer.root.remove(container);
  };

  return { container, cleanup, displayContent };
}

export { createContentView };
