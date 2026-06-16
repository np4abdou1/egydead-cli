const BASE = 'https://tv9.egydead.live';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';

async function postHTML(url) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'View=1',
  });
  return { status: res.status, html: await res.text() };
}

function extract(html) {
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';

  const servers = [];
  const sSection = html.match(/class="serversList"[^>]*>([\s\S]*?)<\/ul>/);
  if (sSection) {
    const re = /<li[^>]*data-link="([^"]*)"[^>]*>([\s\S]*?)<\/li>/g;
    let m;
    while ((m = re.exec(sSection[1])) !== null) {
      servers.push({ name: m[2].replace(/<[^>]*>/g, '').trim(), iframeUrl: m[1] });
    }
  }

  const downloads = [];
  const dSection = html.match(/class="donwload-servers-list"[^>]*>([\s\S]*?)<\/ul>/);
  if (dSection) {
    const re = /<li[^>]*>([\s\S]*?)<\/li>/g;
    let m;
    while ((m = re.exec(dSection[1])) !== null) {
      const li = m[1];
      const name = (li.match(/class="ser-name"[^>]*>([\s\S]*?)<\/span>/) || [])[1];
      const quality = (li.match(/class="server-info[^>]*>[\s\S]*?<em[^>]*>([\s\S]*?)<\/em>/) || [])[1];
      const linkMatch = li.match(/class="ser-link"[^>]*href="([^"]*)"/) || li.match(/href="([^"]*)"[^>]*class="ser-link"/);
      const link = linkMatch ? linkMatch[1] : undefined;
      if (link) {
        downloads.push({
          name: (name || 'unknown').trim(),
          quality: (quality || 'unknown').trim(),
          url: link,
        });
      }
    }
  }

  const episodes = [];
  const epSection = html.match(/class="episodes-list"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
  if (epSection) {
    const re = /<a[^>]*href="([^"]*)"[^>]*title="([^"]*)"[^>]*>/g;
    let m;
    while ((m = re.exec(epSection[1])) !== null) {
      episodes.push({ title: m[2], url: m[1] });
    }
  }

  return { title, servers, downloads, episodes };
}

async function resolve(url) {
  const { html } = await postHTML(url);
  const data = extract(html);

  const slug = url.replace(BASE, '').replace(/^\/|\/$/g, '');
  const id = slug.replace(/[^a-zA-Z0-9_-]/g, '_');

  return { id, title: data.title, url, servers: data.servers, downloads: data.downloads, episodes: data.episodes };
}

async function deepResolveDownload(downloadUrl) {
  const host = new URL(downloadUrl).hostname;
  if (host !== 'forafile.com') return downloadUrl;

  const getRes = await fetch(downloadUrl, {
    headers: { 'User-Agent': UA },
    redirect: 'manual',
  });
  const html = await getRes.text();

  const id = (html.match(/name="id"[^>]*value="([^"]*)"/) || [])[1];
  const referer = (html.match(/name="referer"[^>]*value="([^"]*)"/) || [])[1] || downloadUrl;
  if (!id) return downloadUrl;

  const postRes = await fetch(downloadUrl, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: referer,
    },
    body: new URLSearchParams({
      op: 'download2',
      id: id,
      rand: Math.random().toString(36).substring(2),
      referer: referer,
      method_free: '1',
      method_premium: '',
    }),
    redirect: 'manual',
  });

  const location = postRes.headers.get('location');
  return location || downloadUrl;
}

module.exports = { resolve, deepResolveDownload };
