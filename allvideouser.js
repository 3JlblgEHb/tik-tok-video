const { url } = require("inspector");
const puppeteer = require("puppeteer-extra");
const https = require('https');
const fs = require('fs');
const path = require('path');


const stealthPlugin = require("puppeteer-extra-plugin-stealth")();

["chrome.runtime", "navigator.languages"].forEach(a =>
  stealthPlugin.enabledEvasions.delete(a)
);

puppeteer.use(stealthPlugin);

main();
async function main() {

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    delete navigator.__proto__.webdriver;
  });
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  })
  const args = process.argv.slice(2)
  const userLink = 'https://www.tiktok.com/@daryamaryatt'//args[0]

 

  await page.goto(userLink); //change this to user url page
  let username = page.url().slice(23,).replace(/[-:.\/*<>|?]/g, "");

  const baseFolder = path.join(__dirname, username);
  if (!fs.existsSync(baseFolder)) {
    fs.mkdirSync(baseFolder, { recursive: true });
  }

  console.log('Start scrolling')
  await autoScroll(page);
  console.log('Stop scrolling')

  const urls = await page.evaluate(() =>  Array.from(document.querySelectorAll('div.css-1qb12g8-DivThreeColumnContainer > div > div > div > div > div > a'), element => element.href))

  let loginButton = await page.evaluate(()=> !!(document.querySelector('#login-modal-title + div + div + div')));
  if (loginButton) {
    let element = await page.evaluate(() =>  document.querySelector('#login-modal-title + div + div + div').className.replace(' ', '.')); 
     await page.click(`.${element}`);

  }

  for (const url of urls) {

      try {
        let folderName = url.split('/').pop();
        let folderPath = path.join(baseFolder, folderName);
        let filename = path.join(folderPath, `${folderName}.json`);
  
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
  
      
      if (fs.existsSync(filename) && fs.existsSync(folderPath + '/video.mp4')) {
        console.log(`Exitcontent exists : ${url}`)
        continue
      } 
      
      let tikTokObject = {}
  
      await page.goto(url);
      await page.waitForNavigation();
      await page.click('.css-1a3eiq7-DivRightControlsWrapper.e1ya9dnw9 > div:last-child');
  
      tikTokObject.video_url = url;
      tikTokObject.video_description = await page.evaluate(() => document.querySelector('.css-1fbzdvh-H1Container.ejg0rhn1').innerText); 
      tikTokObject.video_transcription = ''
  
      const element = await page.evaluate(() => !!(document.querySelector('.css-1gge4l1-DivContainer.e2ipgxl0')))
        if (element) {
  
          const isTranscriptButton = await page.evaluate(() => document.querySelector('.css-1gge4l1-DivContainer.e2ipgxl0 li:last-child').innerText === 'Transcript')
            if (isTranscriptButton) {
  
              await page.click('.css-1gge4l1-DivContainer.e2ipgxl0 li:last-child');
              await page.waitForSelector('.css-vj0q71-UlTranscriptList.ejx52ff3 li div:last-child', 59)
              let videoTranscription = await page.evaluate(() => Array.from(document.querySelectorAll('.css-vj0q71-UlTranscriptList.ejx52ff3  li  div:last-child')).map(el => el.innerText));
              tikTokObject.video_transcription = videoTranscription.join(' ');
            } 
        } 
  
        
  
      const data = JSON.stringify(tikTokObject, null, 2);
  
        fs.writeFile(filename, data, (err) => {
          if (err) {
            throw err;
          }
          console.log(`Data written to file ${filename}`);
        });

        await downloadVideo(browser, url, folderPath);

        
      } catch (error) {
        console.log(`Something  wrong with ${url}`)
        console.log('Error' , error)
      }
  }

  browser.close();
}

async function downloadVideo(browser, url, path){

    return await new Promise( async resolve => {
      try {
        const page = await browser.newPage();
        await page.waitForTimeout(getHighNumber());
        await page.goto('https://snaptik.app/');
        await page.waitForTimeout(getRandomNumber());

        await page.waitForSelector('input[name="url"]');
        await page.type('input[name="url"]', (url), { delay: 50 }); 

        await page.waitForTimeout(getRandomNumber());

        await page.click('.button-go');
        await page.waitForTimeout(getHighNumber());
      
        await page.waitForXPath('//*[@id="download"]/div/div[2]/a[1]');
        const featureArticle = (await page.$x('//*[@id="download"]/div/div[2]/a[1]'))[0];
        const text = await page.evaluate(el => {
          return el.href;
        }, featureArticle);
      
        var noWaterMark = text
        const content = decodeURIComponent(noWaterMark);
        try {
          if (!fs.existsSync(path)) {
            fs.mkdirSync(path)
          }
        } catch (err) {
          console.error(err)
        }

        await page.close();

        const request = https.get(content, function (response) {
          if (response.statusCode === 200) {
            var file = fs.createWriteStream(path + '/video.mp4');
            response.pipe(file);
            console.log(file.path + ' Saved!')
            resolve(true)
          }
        });

        
      } catch (err) {
        console.error('Failed to download video', url)
        resolve(false)
      }
    })

    
}

function getRandomNumber() {
  var random = Math.floor(Math.random() * (500 - 300 + 1)) + 300;
  return random;
};

function getHighNumber() {
  var random = Math.floor(Math.random() * (500 - 300 + 1)) + 1150;
  return random;
};

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}