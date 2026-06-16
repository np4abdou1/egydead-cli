const inquirer = require('inquirer');
const { spawn } = require('child_process');
const { search } = require('./search');
const { resolve, deepResolveDownload } = require('./resolve');

const Separator = inquirer.Separator;

function playWithMpv(url) {
  return new Promise((resolve, reject) => {
    const proc = spawn('mpv', [url], { stdio: 'inherit', detached: false });
    proc.on('error', (err) => {
      if (err.code === 'ENOENT') {
        console.log('mpv not found. Install it or use another player.');
        resolve(false);
      } else {
        reject(err);
      }
    });
    proc.on('close', (code) => {
      console.log(`mpv exited (code ${code})`);
      resolve(true);
    });
  });
}

async function showContent(data) {
  if (data.servers.length > 0) {
    console.log('\nStreaming Servers:');
    data.servers.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name}`);
      console.log(`     ${s.iframeUrl}`);
    });
  }

  if (data.downloads.length > 0) {
    console.log('\nDownload Links:');
    data.downloads.forEach((d, i) => {
      console.log(`  ${String(i + 1).padStart(2, ' ')}. [${d.quality}] ${d.name}`);
      console.log(`     ${d.url}`);
    });
  }

  if (data.servers.length === 0 && data.downloads.length === 0) {
    console.log('\nNo servers or downloads found for this page.');
    return false;
  }

  const { deep } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'deep',
      message: 'Deep-resolve Forafile download URLs?',
      default: false,
    },
  ]);

  const directUrls = [];
  if (deep) {
    const forafileDownloads = data.downloads.filter((d) => d.url.includes('forafile.com'));
    if (forafileDownloads.length === 0) {
      console.log('No Forafile downloads found.');
    } else {
      console.log('');
      for (const d of forafileDownloads) {
        process.stdout.write(`  Resolving ${d.name}... `);
        const directUrl = await deepResolveDownload(d.url);
        console.log(directUrl);
        if (directUrl && directUrl !== d.url) {
          directUrls.push({ name: d.name, url: directUrl });
        }
      }
    }
  } else {
    directUrls.push(...data.downloads.map(d => ({ name: d.name, url: d.url })));
  }

  const urlsToPlay = directUrls.length > 0 ? directUrls : data.downloads.map(d => ({ name: d.name, url: d.url }));
  const videoUrls = urlsToPlay.filter(d => d.url.includes('sfile.sbs') || d.url.match(/\.mp4$/));

  if (videoUrls.length > 0) {
    const { play } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'play',
        message: `Play with mpv? (${videoUrls[0].name})`,
        default: false,
      },
    ]);

    if (play) {
      let targetUrl = videoUrls[0].url;
      if (videoUrls.length > 1) {
        const { choice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'choice',
            message: 'Which URL to play?',
            choices: videoUrls.map(d => ({ name: d.name, value: d.url })),
          },
        ]);
        targetUrl = choice;
      }
      console.log(`\nLaunching mpv with ${targetUrl}...\n`);
      await playWithMpv(targetUrl);
    }
  }

  return true;
}

async function interactive() {
  let running = true;

  while (running) {
    const { query } = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Search EgyDead:',
        validate: (v) => v.trim().length > 0 || 'Please enter a search term',
      },
    ]);

    const results = await search(query, 20);
    if (results.length === 0) {
      console.log('No results found.\n');
      continue;
    }

    const choices = results.map((r, i) => ({
      name: `${String(i + 1).padStart(2, ' ')}. ${r.title} (${r.category})`,
      value: r,
      short: r.title,
    }));
    choices.push(new Separator());
    choices.push({ name: '  Back to search', value: '__back__' });

    const { selection } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selection',
        message: `Results for "${query}":`,
        choices,
        pageSize: 15,
        loop: false,
      },
    ]);

    if (selection === '__back__') continue;

    let currentItem = selection;

    while (currentItem) {
      console.log(`\nResolving: ${currentItem.title}`);

      let data;
      try {
        data = await resolve(currentItem.url);
      } catch (err) {
        console.log(`Failed to resolve: ${err.message}\n`);
        break;
      }

      console.log(`  ${data.servers.length} servers, ${data.downloads.length} downloads`);

      const isSeason = currentItem.url.includes('/season/');

      if (isSeason && data.episodes.length > 0) {
        console.log('\nEpisodes in this season:');
        const epChoices = data.episodes.map((e, i) => ({
          name: `  ${String(i + 1).padStart(2, ' ')}. ${e.title.substring(0, 70)}`,
          value: e,
          short: e.title.substring(0, 40),
        }));
        epChoices.push(new Separator());
        epChoices.push({ name: '  Back to search', value: '__back__' });

        const { epChoice } = await inquirer.prompt([
          {
            type: 'list',
            name: 'epChoice',
            message: 'Select episode:',
            choices: epChoices,
            pageSize: 20,
            loop: false,
          },
        ]);

        if (epChoice === '__back__') break;

        console.log(`\nResolving episode: ${epChoice.title}`);
        let epData;
        try {
          epData = await resolve(epChoice.url);
        } catch (err) {
          console.log(`Failed to resolve episode: ${err.message}`);
          break;
        }

        console.log(`  ${epData.servers.length} servers, ${epData.downloads.length} downloads`);
        await showContent(epData);
        break;
      } else {
        await showContent(data);
        break;
      }
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What next?',
        choices: [
          { name: '  Search again', value: 'search' },
          { name: '  Exit', value: 'exit' },
        ],
      },
    ]);

    if (action === 'exit') running = false;
  }
}

module.exports = { interactive };
