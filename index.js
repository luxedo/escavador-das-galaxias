const puppeteer = require("puppeteer");
const imageSize = require("image-size");
const fs = require("fs");
const util = require("util");
const { get } = require("https");
const exec = util.promisify(require("child_process").exec);

const url = "https://www.spacetelescope.org/images/viewall/page/";

async function baixarArquivo(src, filename) {
  fs.appendFile("imagens.log", src + ";" + filename + "\n", err => console.err);
  console.log("Baxano: " + src + " => " + filename);
  const file = fs.createWriteStream(filename);
  try {
    await get(
      src,
      response => {
        response.pipe(file);
      },
      err => {
        console.log("Num deu pra baixar:" + filename);
      }
    );
  } catch {
    console.log("Num deu :(");
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  for (let p = 1; p < 20; p++) {
    let counter = 0;
    const urlinho = url + p;
    console.log("Começano a cavação! Url: " + urlinho);
    let imgSrc = [];
    for (let j = 0; j < 3; j++) {
      try {
        await page.goto(urlinho, { timeout: 60000 });
        await page.waitForSelector(".image-list");
        imgSrc = await page.$$eval("img", imgs =>
          imgs.map(img => img.getAttribute("src").replace("thumb300y", "large"))
        );
        break;
      } catch {
        console.log("Não deu :(");
        // fs.appendFile("erro.log", urlinho + "\n", err => console.err);
      }
    }
    for (let i = 0; i < imgSrc.length; i++) {
      const src = imgSrc[i];
      const filename = "out/" + p + "/" + src.replace(/.*\//, "");
      await exec(`identify -verbose ${filename}`) // Tá corrompidin?
        .then(async ({ stdout, stderr }) => {
          if (stderr != "" && stderr.includes("Corrupt")) {
            console.log("Arquivo esquisito:" + filename);
            await baixarArquivo(src, filename);
          } else {
            console.log("Tudo certin!" + filename);
          }
        })
        .catch(async err => {
          await baixarArquivo(src, filename);
        });
    }
  }
})();
