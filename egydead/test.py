import sys
from .title import parse_title, extract_episode_num, increment_episode
from .history import add_entry, get_history, clear_history, remove_entry

passed = 0
failed = 0


def ok(name, condition):
    global passed, failed
    if condition:
        passed += 1
        print(f'  PASS: {name}')
    else:
        failed += 1
        print(f'  FAIL: {name}')


def test_title():
    global passed, failed

    r = parse_title('مسلسل The Testaments الموسم الاول الحلقة 10 مترجمة')
    ok('Series episode', r['english'] == 'The Testaments S01E10')

    r = parse_title('مسلسل The Testaments الموسم الاول الحلقة 10 مترجمة   | ايجي ديد')
    ok('Website suffix stripped', r['english'] == 'The Testaments S01E10')

    r = parse_title('انمي One Piece الحلقة 1168 مترجمة')
    ok('Anime', r['english'] == 'One Piece E1168')

    r = parse_title('مشاهدة فيلم Avatar 3 Fire and Ash 2025 مترجم')
    ok('Movie مشاهدة فيلم', r['english'] == 'Avatar 3 Fire and Ash (2025)')

    r = parse_title('فيلم Shelter 2026 مترجم')
    ok('Movie فيلم', r['english'] == 'Shelter (2026)')

    r = parse_title('مسلسل The Testaments الموسم الاول مترجم كامل')
    ok('Season page', r['english'] == 'The Testaments S01')

    r = parse_title('مسلسل احتمال حب الجزء الاول الحلقة 15 مدبلجة')
    ok('Arabic الجزء', r['english'] == 'احتمال حب S01E15')

    r = parse_title('برنامج Baylen Out Loud الموسم الثالث الحلقة 7 مترجمة')
    ok('برنامج prefix', r['english'] == 'Baylen Out Loud S03E07')

    r = parse_title('مسلسل The Boys الموسم الخامس الحلقة 8 مترجمة')
    ok('Season الخامس', r['season'] == '5')

    r = parse_title('انمي مذكرة الموت الحلقة 25 مترجمة')
    ok('Anime Arabic', r['english'] == 'مذكرة الموت E25')

    r = parse_title('مسلسل Silo الموسم الثالث مترجم كامل')
    ok('Season page s3', r['season'] == '3')

    r = extract_episode_num('test', 'https://tv9.egydead.live/episode/the-testaments-s01e10')
    ok('extractEpisodeNum from URL', r['season'] == '01' and r['episode'] == '10')

    r = increment_episode('1', '10')
    ok('incrementEpisode', r['episode'] == '11')

    r = increment_episode(None, '5')
    ok('incrementEpisode no season', r['episode'] == '06')


def test_history():
    clear_history()
    ok('empty after clear', len(get_history()) == 0)
    add_entry({'title': 'Test', 'english': 'Test S01E01', 'url': '/test'})
    ok('1 entry', len(get_history()) == 1)
    clear_history()
    ok('empty after re-clear', len(get_history()) == 0)


def test_live_search():
    from .search import search
    results = search('test', 2)
    ok('search returns results', len(results) > 0)
    if results:
        ok('result has title', bool(results[0].get('title')))
        ok('result has url', bool(results[0].get('url')))


def test_live_resolve():
    from .search import search
    from .resolve import resolve
    results = search('test', 1)
    if results:
        data = resolve(results[0]['url'])
        ok('resolve has title', bool(data.get('title')))
        ok('resolve has servers list', isinstance(data.get('servers'), list))
        ok('resolve has downloads list', isinstance(data.get('downloads'), list))
        ok('resolve has episodes list', isinstance(data.get('episodes'), list))


if __name__ == '__main__':
    passed = 0
    failed = 0

    print('\n=== Title Parsing ===')
    test_title()

    print('\n=== History ===')
    test_history()

    print('\n=== Live Search ===')
    try:
        test_live_search()
    except Exception as e:
        print(f'  SKIP: search (network error: {e})')

    print('\n=== Live Resolve ===')
    try:
        test_live_resolve()
    except Exception as e:
        print(f'  SKIP: resolve (network error: {e})')

    print(f'\n=== {passed} passed, {failed} failed ===')
    sys.exit(1 if failed > 0 else 0)
