#!/usr/bin/env zx
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { MESSAGES } from './constants.mjs';
import { log, downloadFile, writeError } from './utils.mjs';

dotenv.config();

(async () => {
  const BASE_URL = 'https://bok.multi-telekom.pl/panel/';
  const date = new Date();
  const year = `${date.getFullYear()}`;
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = '01';
  const searchDate = `${day}/${month}/${year}`;
  const invoiceName = `faktura-multi-telekom__${month}_${year}`;

  // INIT
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: '.cache',
  });

  const page = await browser.newPage();

  // RESIZE PAGE
  await page.setViewport({
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
  });

  // GO TO LOGIN PAGE
  await page.goto(BASE_URL);
  await page.screenshot({ path: 'screenshots/1-login-page.png' });
  log('Opened login page', 'success');

  // FILL INPUTS
  await page.$eval(
    'input[name="login"]',
    (el, value) => {
      el.value = value;
    },
    process.env.MTK_LOGIN
  );

  await page.$eval(
    'input[name="haslo"]',
    (el, value) => {
      el.value = value;
    },
    process.env.MTK_PASS
  );
  // await page.screenshot({ path: 'screenshots/2-filled-inputs.png' });

  // LOGIN
  await page.click('input[type="submit"]');
  log('Waiting to log in...');

  // WAIT FOR ANY OF THOSE SELECTORS
  await page.waitForFunction(
    () => document.querySelectorAll('font[color="red"], a[href="?co=faktury"]').length
  );

  try {
    await page.waitForSelector('a[href="?co=faktury"]', { timeout: 2000 });
  } catch (err) {
    const pageUrl = await page.url();

    // GET ERROR MESSAGE FROM PAGE IF URL CONTAINS error=1
    if (pageUrl.includes('error=1')) {
      const errorElement = await page.$('font[color="red"]');
      const errorMsg = await errorElement.evaluate((el) => el.textContent);
      const errorText = errorMsg ? `Page error: ${errorMsg}` : MESSAGES.DEFAULT_ERROR;

      // await page.screenshot({ path: 'screenshots/3-blad-logowania.png' });
      writeError({ msg: errorText });
    } else {
      // await page.screenshot({ path: 'screenshots/3-blad-logowania.png' });
      writeError({ msg: MESSAGES.DEFAULT_ERROR });
    }
    await browser.close();
    return;
  }

  // await page.screenshot({ path: 'screenshots/3-zalogowany.png' });
  log('Logged in successfully!', 'success');

  // GO TO INVOICES PAGE
  await page.click('a[href="?co=faktury"]');
  log('Waiting to navigate...');

  await page.waitForSelector('a[target="_blank"]');
  // await page.screenshot({ path: 'screenshots/4-lista-faktur.png' });
  log('Successfully navigated!', 'success');

  // SEARCH FOR CURRENT INVOICE
  const invoiceUrl = await page.$$eval(
    'a[target="_blank"]',
    (invoicesLinks, currentDate) => {
      const currentIndex = invoicesLinks.findIndex((link) => {
        const content = link.textContent.trim();
        const dateOnly = content.split('dnia ')[1];
        return dateOnly === currentDate.searchDate;
      });

      if (currentIndex === -1) {
        return null;
      }

      return invoicesLinks[currentIndex].getAttribute('href');
    },
    {
      year,
      month,
      day,
      searchDate,
    }
  );

  if (!invoiceUrl) {
    await page.screenshot({ path: 'screenshots/5-brak-faktury.png' });
    writeError({ msg: `${MESSAGES.INVOICE_NOT_FOUND} - ${searchDate}` });
  } else {
    log('Downloading invoice...', 'info');
    try {
      const phpsessid = await (await page.cookies()).find((cookie) => cookie.name === 'PHPSESSID');

      const downloadHeaders = {
        headers: {
          cookie: `PHPSESSID=${phpsessid.value}`,
        },
      };

      await downloadFile(`${BASE_URL}${invoiceUrl}`, `${invoiceName}.pdf`, downloadHeaders);
    } catch (err) {
      writeError({ msg: 'Error occured during invoice download', stack: err });
    }
  }

  // CLOSE
  await browser.close();
})();
