#!/usr/bin/env zx
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  console.log(process.env.MTK_LOGIN);
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://tysian.pl/');
  await page.screenshot({path: 'example.png'});

  await browser.close();
})();
