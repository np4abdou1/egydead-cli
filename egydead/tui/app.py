import asyncio
import subprocess
from typing import Optional

from textual import on
from textual.app import App, ComposeResult
from textual.containers import Center, Vertical, Horizontal
from textual.screen import Screen, ModalScreen
from textual.widgets import Header, Footer, Input, ListView, ListItem, Label, Static, Button

from ..search import search as api_search
from ..resolve import resolve as api_resolve
from ..title import parse_title, extract_episode_num, increment_episode
from ..history import add_entry, get_history, clear_history


class SearchScreen(Screen):
    def compose(self) -> ComposeResult:
        yield Header()
        yield Center(
            Vertical(
                Label(' EgyDead CLI ', id='app-title'),
                Label('Search Movies & Series', id='app-subtitle'),
                Input(placeholder='Type search query and press Enter...', id='search-input'),
                Label('', id='search-hint'),
                classes='search-box',
            ),
        )
        yield Footer()

    def on_mount(self) -> None:
        self.query_one('#search-input', Input).focus()

    def on_input_submitted(self, event: Input.Submitted) -> None:
        query = event.value.strip()
        if query:
            self.app.push_screen('results', ResultsScreen(query))


class ResultsScreen(Screen):
    def __init__(self, query: str):
        super().__init__()
        self.query = query
        self.results = []
        self._loading = True

    def compose(self) -> ComposeResult:
        yield Header()
        yield Center(
            Vertical(
                Static(f'Searching: {self.query}...', id='results-status'),
                ListView(id='results-list', classes='results-box'),
                classes='results-container',
            ),
        )
        yield Footer()

    def on_mount(self) -> None:
        self._load_results()

    async def _load_results(self):
        try:
            self.results = await asyncio.to_thread(api_search, self.query, 20)
            list_view = self.query_one('#results-list', ListView)
            list_view.clear()
            for i, r in enumerate(self.results):
                p = parse_title(r['title'])
                label = f'{i + 1}. {p["english"]}'
                desc = f'  [{r["category"]}]'
                item = ListItem(Label(label), Label(desc, classes='result-desc'))
                item.data = r
                list_view.append(item)
            status = self.query_one('#results-status', Static)
            status.update(f'Results for "{self.query}" ({len(self.results)} found)')
            if list_view.children:
                list_view.focus()
            self._loading = False
        except Exception as e:
            self.query_one('#results-status', Static).update(f'Error: {e}')

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        if self._loading or not event.item:
            return
        item = event.item
        data = getattr(item, 'data', None)
        if data:
            self.app.push_screen('content', ContentScreen(data))

    def key_b(self):
        self.app.pop_screen()

    def key_h(self):
        self.app.push_screen('history', HistoryScreen())

    BINDINGS = [
        ('b', 'b', 'Back'),
        ('h', 'h', 'History'),
        ('q', 'quit', 'Quit'),
    ]

    def action_quit(self):
        self.app.exit()


class ContentScreen(Screen):
    def __init__(self, item: dict):
        super().__init__()
        self.item = item
        self.data = None
        self._loading = True

    def compose(self) -> ComposeResult:
        yield Header()
        yield Center(
            Vertical(
                Static('Resolving...', id='content-title', classes='content-title'),
                Static('', id='content-body'),
                classes='content-container',
            ),
        )
        yield Footer()

    def on_mount(self) -> None:
        self._load()

    async def _load(self):
        try:
            self.data = await asyncio.to_thread(api_resolve, self.item['url'])
            parsed = parse_title(self.data['title'])
            english = parsed['english']

            add_entry({
                'title': self.data['title'],
                'english': english,
                'show': parsed['show'],
                'season': parsed['season'],
                'episode': parsed['episode'],
                'url': self.item['url'],
                'category': self.item.get('category', ''),
            })

            title_w = self.query_one('#content-title', Static)
            title_w.update(f'[bold green]{english}[/]')
            title_w.styles.border = ('rounded', 'green')

            body = self.query_one('#content-body', Static)
            lines = []

            if self.data.get('servers'):
                lines.append('[bold yellow]Streaming Servers:[/]')
                for i, s in enumerate(self.data['servers'], 1):
                    lines.append(f'  {i}. {s["name"]}')

            if self.data.get('downloads'):
                lines.append('')
                lines.append('[bold yellow]Downloads:[/]')
                for i, d in enumerate(self.data['downloads'], 1):
                    lines.append(f'  {i}. [{[d["quality"]]}] {d["name"]}')

            if self.data.get('episodes'):
                lines.append('')
                lines.append(f'[bold yellow]Episodes ({len(self.data["episodes"])}):[/]')
                for i, e in enumerate(self.data['episodes'], 1):
                    ep = parse_title(e['title'])
                    lines.append(f'  {i}. {ep["english"][:60]}')

            if not self.data.get('servers') and not self.data.get('downloads') and not self.data.get('episodes'):
                lines.append('[red]No servers, downloads, or episodes found.[/]')

            body.update('\n'.join(lines))
            self._loading = False
        except Exception as e:
            self.query_one('#content-title', Static).update(f'[red]Error: {e}[/]')
            self._loading = False

    def key_b(self):
        self.app.pop_screen()

    def key_p(self):
        if not self.data or not self.data.get('downloads'):
            return
        targets = [d for d in self.data['downloads'] if 'sfile.sbs' in d['url'] or d['url'].endswith('.mp4')]
        if not targets:
            self.query_one('#content-title', Static).update(
                self.query_one('#content-title', Static).renderable + '\n[red]No playable URL[/]'
            )
            return
        try:
            subprocess.Popen(
                ['mpv', targets[0]['url']],
                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
        except FileNotFoundError:
            pass

    def key_n(self):
        if not self.data or not self.data.get('episodes') or self._loading:
            return
        ep_info = extract_episode_num(self.data['title'], self.item['url'])
        if not ep_info.get('episode'):
            return
        next_ep = increment_episode(ep_info.get('season'), ep_info['episode'])
        if not next_ep:
            return
        next_str = f's{next_ep["season"]}e{next_ep["episode"]}'
        for e in self.data['episodes']:
            url = e['url'].lower()
            if next_str in url or f'e{next_ep["episode"]}' in url:
                self.app.pop_screen()
                self.app.push_screen('content', ContentScreen({'title': e['title'], 'url': e['url'], 'category': ''}))
                return
        body = self.query_one('#content-body', Static)
        body.update(body.renderable + '\n[red]No next episode found.[/]')

    def key_e(self):
        if self.data and self.data.get('episodes') and not self._loading:
            self.app.push_screen('episodes', EpisodeListScreen(self.data['episodes']))

    def key_h(self):
        self.app.push_screen('history', HistoryScreen())

    BINDINGS = [
        ('b', 'b', 'Back'),
        ('p', 'p', 'Play'),
        ('n', 'n', 'Next Episode'),
        ('e', 'e', 'Episodes'),
        ('h', 'h', 'History'),
        ('q', 'quit', 'Quit'),
    ]

    def action_quit(self):
        self.app.exit()


class EpisodeListScreen(Screen):
    def __init__(self, episodes: list):
        super().__init__()
        self.episodes = episodes

    def compose(self) -> ComposeResult:
        yield Header()
        yield Center(
            Vertical(
                Static(f'Episodes ({len(self.episodes)}):', id='ep-header'),
                ListView(id='ep-list', classes='results-box'),
            ),
        )
        yield Footer()

    def on_mount(self) -> None:
        list_view = self.query_one('#ep-list', ListView)
        for i, e in enumerate(self.episodes):
            p = parse_title(e['title'])
            label = f'{i + 1}. {p["english"][:70]}'
            item = ListItem(Label(label))
            item.data = e
            list_view.append(item)
        if list_view.children:
            list_view.focus()

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        item = event.item
        data = getattr(item, 'data', None)
        if data:
            self.app.pop_screen()
            self.app.push_screen('content', ContentScreen(data))

    def key_b(self):
        self.app.pop_screen()

    BINDINGS = [
        ('b', 'b', 'Back'),
        ('q', 'quit', 'Quit'),
    ]

    def action_quit(self):
        self.app.exit()


class HistoryScreen(Screen):
    def compose(self) -> ComposeResult:
        yield Header()
        yield Center(
            Vertical(
                Static('Continue Watching', id='hist-header'),
                ListView(id='hist-list', classes='results-box'),
            ),
        )
        yield Footer()

    def on_mount(self) -> None:
        self._rebuild()

    def _rebuild(self):
        entries = get_history()
        list_view = self.query_one('#hist-list', ListView)
        list_view.clear()
        if not entries:
            list_view.append(ListItem(Label('[dim]No history yet.[/]')))
            return
        for e in entries:
            name = (e.get('english') or e.get('title', ''))[:70]
            date = ''
            ts = e.get('timestamp')
            if ts:
                from datetime import datetime
                date = datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
            label = f'{name}  [dim]{date}[/]'
            item = ListItem(Label(label))
            item.data = e
            list_view.append(item)
        if list_view.children:
            list_view.focus()

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        item = event.item
        data = getattr(item, 'data', None)
        if data:
            self.app.pop_screen()
            self.app.push_screen('content', ContentScreen(data))

    def key_b(self):
        self.app.pop_screen()

    def key_c(self):
        clear_history()
        self._rebuild()

    BINDINGS = [
        ('b', 'b', 'Back'),
        ('c', 'c', 'Clear History'),
        ('q', 'quit', 'Quit'),
    ]

    def action_quit(self):
        self.app.exit()


class EgyDeadApp(App):
    SCREENS = {
        'search': SearchScreen,
        'results': ResultsScreen,
        'content': ContentScreen,
        'episodes': EpisodeListScreen,
        'history': HistoryScreen,
    }

    CSS = """
    Screen {
        align: center middle;
    }

    .search-box {
        width: 60%;
        min-width: 40;
        height: auto;
        margin: 1 2;
    }

    .results-container {
        width: 80%;
        min-width: 50;
        height: 100%;
    }

    .results-box {
        width: 100%;
        height: 80%;
        margin: 1 0;
        border: solid green;
    }

    .content-container {
        width: 80%;
        min-width: 50;
        height: 100%;
    }

    .content-title {
        width: 100%;
        padding: 1 2;
        text-align: center;
    }

    #app-title {
        text-style: bold;
        color: green;
        text-align: center;
        padding: 1 0;
    }

    #app-subtitle {
        text-align: center;
        color: $text;
        padding: 0 0 1 0;
    }

    #search-input {
        width: 100%;
    }

    #search-hint {
        text-align: center;
        color: $text-muted;
        padding: 1 0;
    }

    ListView {
        border: solid green;
    }

    ListView:focus {
        border: solid $accent;
    }

    ListItem {
        padding: 0 1;
    }

    ListItem > Label {
        padding: 0 1;
    }

    .result-desc {
        color: $text-muted;
        padding: 0 2;
    }

    Static {
        padding: 0 1;
    }

    Header {
        background: $surface;
    }

    Footer {
        background: $surface;
    }

    Vertical {
        align: center top;
    }
    """

    BINDINGS = [
        ('q', 'quit', 'Quit'),
    ]

    def on_mount(self) -> None:
        self.push_screen('search')

    def action_quit(self):
        self.exit()


def main():
    app = EgyDeadApp()
    app.run()


if __name__ == '__main__':
    main()
