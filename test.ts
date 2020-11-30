require('dotenv').config(__dirname + '/.env');

const { IgApiClient } = require('instagram-private-api');
const util = require('util');
const fs = require('fs')
const { promisify } = require('util');
const { readFile } = require('fs');
const readFileAsync = promisify(readFile);
const exec = util.promisify(require('child_process').exec);
const axios = require('axios')
const images = require("images");
const randomQuotes = require('random-quotes');
const { v4:uuid } = require('uuid');

async function getLocation() {
  const { stdout } = await exec('whereami -f json --noanim');
  return stdout
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

const download_image = (url, image_path) =>
  axios({
    url,
    responseType: 'stream',
  }).then(
    response =>
      new Promise((resolve, reject) => {
        response.data
          .pipe(fs.createWriteStream(image_path))
          .on('finish', () => resolve())
          .on('error', e => reject(e));
      }),
  );

const ig = new IgApiClient();

async function login() {
  ig.state.generateDevice(process.env.IG_USERNAME);
  await ig.simulate.preLoginFlow();
  await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
}

(async () => {

  await login();
  process.nextTick(async () => await ig.simulate.postLoginFlow());

  /* Download resources */
  const botUrl = `https://robohash.org/${uuid()}?size=300x300`
  await download_image(botUrl, './cache/bot.jpg');
  await download_image('https://picsum.photos/300', './cache/background.jpg');
  const botPath = './cache/bot.jpg';
  const backgroundPath = './cache/background.jpg';
  const outputPath = "./cache/output.jpg";

  /* Creation of bot + background */
  images(backgroundPath)
  .draw(images(botPath), 0, 0)
  .save(outputPath, {
    quality : 100
  });

  /* get location informations */
  const coord = JSON.parse(await getLocation())
  const latitude = coord.latitude
  const longitude = coord.longitude
  const searchQuery = 'place'

  /* get random location from ig */
  const locations = await ig.search.location(latitude, longitude, searchQuery);
  const mediaLocation = locations[getRandomInt(locations.length)];

  /* publish photo + random caption */
  const publishResult = await ig.publish.photo({
    file: await readFileAsync(outputPath),
    caption: randomQuotes.default().body,
    location: mediaLocation,
  });

  console.log(publishResult.status);

})();
