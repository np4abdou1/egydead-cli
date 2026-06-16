const BASE = 'https://tv9.egydead.live';

function parseSearchHTML(html) {
  const results = [];
  const itemRegex = /<li class="movieItem">[\s\S]*?<a href="([^"]+)" title="([^"]*)">[\s\S]*?<h1 class="BottomTitle">([^<]+)<\/h1>[\s\S]*?<span class="cat_name">([^<]+)<\/span>[\s\S]*?<\/a>[\s\S]*?<\/li>/gi;
  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    results.push({
      title: match[3].trim(),
      url: match[1],
      category: match[4].trim(),
    });
  }
  return results;
}

async function search(query, limit = 10) {
  const url = `${BASE}/?s=${encodeURIComponent(query)}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    },
  });
  const html = await resp.text();
  const results = parseSearchHTML(html);
  return results.slice(0, limit);
}

module.exports = { search };
