import argparse
import json
import sys

from .search import search
from .resolve import resolve, deep_resolve_download
from .title import parse_title


def main():
    parser = argparse.ArgumentParser(description='EgyDead CLI - Search and extract download URLs')
    parser.add_argument('command', nargs='?', choices=['search', 'resolve', 'scrape', 'interactive', 'tui'],
                        help='Command to run (default: interactive)')
    parser.add_argument('arg', nargs='?', help='Search query or URL')
    parser.add_argument('--limit', type=int, default=10, help='Result limit (search/scrape)')
    parser.add_argument('--deep', action='store_true', help='Deep-resolve Forafile download URLs')

    args = parser.parse_args()

    if not args.command or args.command in ('interactive', 'tui'):
        from .tui import EgyDeadApp
        app = EgyDeadApp()
        app.run()
        return

    if args.command == 'search':
        if not args.arg:
            print('Usage: python -m egydead.cli search <query> [--limit N]', file=sys.stderr)
            sys.exit(1)
        results = search(args.arg, args.limit)
        enhanced = [{
            **r,
            'english': parse_title(r['title'])['english'],
        } for r in results]
        print(json.dumps({'query': args.arg, 'results': enhanced}, ensure_ascii=False, indent=2))

    elif args.command == 'resolve':
        if not args.arg:
            print('Usage: python -m egydead.cli resolve <url> [--deep]', file=sys.stderr)
            sys.exit(1)
        result = resolve(args.arg)
        if args.deep and result.get('downloads'):
            for d in result['downloads']:
                d['directUrl'] = deep_resolve_download(d['url'])
        result['english'] = parse_title(result['title'])['english']
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif args.command == 'scrape':
        if not args.arg:
            print('Usage: python -m egydead.cli scrape <query> [--limit N] [--deep]', file=sys.stderr)
            sys.exit(1)
        results = search(args.arg, args.limit)
        output = []
        for r in results:
            data = resolve(r['url'])
            if args.deep and data.get('downloads'):
                for d in data['downloads']:
                    d['directUrl'] = deep_resolve_download(d['url'])
            data['english'] = parse_title(data['title'])['english']
            output.append(data)
        print(json.dumps({'query': args.arg, 'results': output}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
