import re
import urllib.request
import urllib.parse

BASE = 'https://tv9.egydead.live'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'


def _fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode('utf-8', errors='replace')


def parse_search_html(html: str) -> list:
    results = []
    pattern = re.compile(
        r'<li class="movieItem">.*?<a href="([^"]+)" title="([^"]*)">.*?<h1 class="BottomTitle">([^<]+)</h1>.*?<span class="cat_name">([^<]+)</span>.*?</a>.*?</li>',
        re.DOTALL | re.IGNORECASE
    )
    for m in pattern.finditer(html):
        results.append({
            'title': m.group(3).strip(),
            'url': m.group(1),
            'category': m.group(4).strip(),
        })
    return results


def search(query: str, limit: int = 10) -> list:
    url = f'{BASE}/?s={urllib.parse.quote(query)}'
    html = _fetch(url)
    results = parse_search_html(html)
    return results[:limit]
