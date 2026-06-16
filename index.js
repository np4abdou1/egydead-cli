#!/usr/bin/env node
const { search } = require('./lib/search');
const { resolve, deepResolveDownload } = require('./lib/resolve');
const { interactive } = require('./lib/interactive');

const argv = process.argv.slice(2);
const command = argv[0];
const isDeep = argv.includes('--deep');

function getArg(name) {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : undefined;
}

let arg = null;
for (let i = 1; i < argv.length; i++) {
  if (argv[i] === '--limit') {
    i++;
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
  if (!command || command === 'interactive') {
    await interactive();
    return;
  }

  switch (command) {
    case 'search': {
      if (!arg) {
        console.error('Usage: node index.js search <query> [--limit N]');
        process.exit(1);
      }
      const limit = parseInt(getArg('--limit'), 10) || 10;
      const results = await search(arg, limit);
      console.log(JSON.stringify({ query: arg, results }, null, 2));
      break;
    }

    case 'resolve': {
      if (!arg) {
        console.error('Usage: node index.js resolve <url> [--deep]');
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
        console.error('Usage: node index.js scrape <query> [--limit N] [--deep]');
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
      console.error('  node index.js                                       Interactive mode');
      console.error('  node index.js interactive                           Interactive mode');
      console.error('  node index.js search <query> [--limit N]            Search for content');
      console.error('  node index.js resolve <url> [--deep]                Get download servers from a page');
      console.error('  node index.js scrape <query> [--limit N] [--deep]   Search and resolve download links');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }, null, 2));
  process.exit(1);
});
