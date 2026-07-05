import re
import urllib.request
import urllib.parse

BASE = 'https://tv9.egydead.live'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'


def _fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode('utf-8', errors='replace')


def _post(url: str, data: dict = None) -> str:
    body = urllib.parse.urlencode(data or {}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode('utf-8', errors='replace')


def extract(html: str) -> dict:
    title_m = re.search(r'<title>([\s\S]*?)</title>', html)
    title = title_m.group(1).strip() if title_m else ''

    servers = []
    s_section = re.search(r'class="serversList"[^>]*>([\s\S]*?)</ul>', html)
    if s_section:
        for m in re.finditer(r'<li[^>]*data-link="([^"]*)"[^>]*>([\s\S]*?)</li>', s_section.group(1)):
            name = re.sub(r'<[^>]*>', '', m.group(2)).strip()
            servers.append({'name': name, 'iframeUrl': m.group(1)})

    downloads = []
    d_section = re.search(r'class="donwload-servers-list"[^>]*>([\s\S]*?)</ul>', html)
    if d_section:
        for m in re.finditer(r'<li[^>]*>([\s\S]*?)</li>', d_section.group(1)):
            li = m.group(1)
            name_m = re.search(r'class="ser-name"[^>]*>([\s\S]*?)</span>', li)
            quality_m = re.search(r'class="server-info[^>]*>[\s\S]*?<em[^>]*>([\s\S]*?)</em>', li)
            link_m = re.search(r'class="ser-link"[^>]*href="([^"]*)"', li) or re.search(r'href="([^"]*)"[^>]*class="ser-link"', li)
            name = name_m.group(1).strip() if name_m else 'unknown'
            quality = quality_m.group(1).strip() if quality_m else 'unknown'
            link = link_m.group(1) if link_m else None
            if link:
                downloads.append({'name': name, 'quality': quality, 'url': link})

    episodes = []
    ep_section = re.search(r'class="episodes-list"[^>]*>([\s\S]*?)</div>\s*</div>', html)
    if ep_section:
        for m in re.finditer(r'<a[^>]*href="([^"]*)"[^>]*title="([^"]*)"[^>]*>', ep_section.group(1)):
            episodes.append({'title': m.group(2), 'url': m.group(1)})

    season_link_m = re.search(r'<a[^>]*href="(/season/[^"]+)"[^>]*>مسلسل', html)
    season_link = season_link_m.group(1) if season_link_m else None

    return {
        'title': title,
        'servers': servers,
        'downloads': downloads,
        'episodes': episodes,
        'seasonLink': season_link,
    }


def resolve(url: str) -> dict:
    html = _post(url, {'View': '1'})
    data = extract(html)

    slug = url.replace(BASE, '').strip('/')
    safe_id = re.sub(r'[^a-zA-Z0-9_-]', '_', slug)

    return {
        'id': safe_id,
        'title': data['title'],
        'url': url,
        'servers': data['servers'],
        'downloads': data['downloads'],
        'episodes': data['episodes'],
        'seasonLink': data['seasonLink'],
    }


def deep_resolve_download(download_url: str) -> str:
    host = urllib.parse.urlparse(download_url).hostname
    if host != 'forafile.com':
        return download_url

    req = urllib.request.Request(
        download_url,
        headers={'User-Agent': UA},
        method='GET',
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='replace')
    except urllib.error.HTTPError as e:
        html = e.read().decode('utf-8', errors='replace')

    id_m = re.search(r'name="id"[^>]*value="([^"]*)"', html)
    ref_m = re.search(r'name="referer"[^>]*value="([^"]*)"', html)
    doc_id = id_m.group(1) if id_m else None
    referer = ref_m.group(1) if ref_m else download_url

    if not doc_id:
        return download_url

    post_data = urllib.parse.urlencode({
        'op': 'download2',
        'id': doc_id,
        'rand': __import__('random').random(),
        'referer': referer,
        'method_free': '1',
        'method_premium': '',
    }).encode()

    post_req = urllib.request.Request(
        download_url,
        data=post_data,
        headers={
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': referer,
        },
        method='POST',
    )

    # Use a opener that doesn't follow redirects
    from urllib.request import HTTPRedirectHandler, build_opener, install_opener

    class NoRedirect(HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    opener = build_opener(NoRedirect)
    try:
        with opener.open(post_req, timeout=15) as resp:
            location = resp.headers.get('Location')
            return location or download_url
    except urllib.error.HTTPError as e:
        location = e.headers.get('Location')
        return location or download_url
