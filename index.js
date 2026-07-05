#!/usr/bin/env bun
import { search } from './lib/search.js';
import { resolve, deepResolveDownload } from './lib/resolve.js';
import { startTUI } from './lib/app.js';

const argv = process.argv.slice(2);
const command = argv[0];
const isDeep = argv.includes('--deep');
const isHeadless = argv.includes('--headless');

function getArg(name) {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : undefined;
}

let arg = null;
for (let i = 1; i < argv.length; i++) {
  if (argv[i] === '--limit') {
    i++;
  } else if (argv[i] === '--deep' || argv[i] === '--headless') {
    // skip flags
  } else if (!argv[i].startsWith('--')) {
    arg = argv[i];
    break;
  }
}

async function deepResolveDownloads(downloads) {
  const enriched = [];
  for (const d of downloads) {
    enriched.push({
      ...d,
      directUrl: await deepResolveDownload(d.url),
    });
  }
  return enriched;
}

async function main() {
  // Default: launch TUI
  if (!command || command === 'interactive') {
    if (!isHeadless) {
      const renderer = await startTUI();
      return;
    }
    // Fall through to old interactive if --headless
  }

  // Headless mode (old CLI commands)
  switch (command) {
    case 'search': {
      if (!arg) {
        console.error('Usage: bun index.js search <query> [--limit N]');
        process.exit(1);
      }
      const limit = parseInt(getArg('--limit'), 10) || 10;
      const results = await search(arg, limit);
      console.log(JSON.stringify({ query: arg, results }, null, 2));
      break;
    }

    case 'resolve': {
      if (!arg) {
        console.error('Usage: bun index.js resolve <url> [--deep]');
        process.exit(1);
      }
      const result = await resolve(arg);
      if (isDeep && result.downloads) {
        result.downloads = await deepResolveDownloads(result.downloads);
      }
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'scrape': {
      if (!arg) {
        console.error('Usage: bun index.js scrape <query> [--limit N] [--deep]');
        process.exit(1);
      }
      const limit = parseInt(getArg('--limit'), 10) || 5;
      const results = await search(arg, limit);
      const output = [];
      for (const r of results) {
        const data = await resolve(r.url);
        if (isDeep && data.downloads) {
          data.downloads = await deepResolveDownloads(data.downloads);
        }
        output.push(data);
      }
      console.log(JSON.stringify({ query: arg, results: output }, null, 2));
      break;
    }

    default:
      console.error('Usage:');
      console.error('  bun index.js                                       Launch TUI (default)');
      console.error('  bun index.js --headless interactive                Old interactive mode');
      console.error('  bun index.js search <query> [--limit N]            Search for content');
      console.error('  bun index.js resolve <url> [--deep]                Get download servers from a page');
      console.error('  bun index.js scrape <query> [--limit N] [--deep]   Search and resolve download links');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }, null, 2));
  process.exit(1);
});
