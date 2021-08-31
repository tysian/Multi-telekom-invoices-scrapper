import fetch from 'node-fetch';
import util from 'util';
import fs from 'fs';
import stream from 'stream';
import dotenv from 'dotenv';
import { COLORS } from './constants.mjs';
import config from './config.mjs';

dotenv.config();

export const log = (s, type = 'info') => {
  console.log(COLORS[(type || 'info').toUpperCase()](s));
};

export const writeError = ({ msg = '', stack = '' }) => {
  log(`Error: ${msg}`, 'error');
  const errorStream = fs.createWriteStream(
    `${process.env.USERPROFILE}\\Downloads\\multitelekom-errors.txt`,
    { flags: 'a+' }
  );
  errorStream.write(
    `[${new Date().toISOString()}] ERROR: ${msg} \n ${stack && `Stack:\n ${stack}`}\n`
  );
  errorStream.end();
};

export async function downloadFile(url, file, options = {}) {
  if (!fs.existsSync(process.env.MTK_DOWNLOADS_DIR)) {
    fs.mkdirSync(process.env.MTK_DOWNLOADS_DIR);
  }
  const downloadsDestFilename = `${process.env.MTK_DOWNLOADS_DIR}/${file}`;

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`unexpected response ${response.statusText}`);
  }

  const streamPipeline = util.promisify(stream.pipeline);
  await streamPipeline(response.body, fs.createWriteStream(downloadsDestFilename));

  if (config.copyTo.length) {
    for (let i = 0; i < config.copyTo.length; i += 1) {
      const dist = config.copyTo[i];
      try {
        fs.copyFile(downloadsDestFilename, `${dist}/${file}`, (err) => {
          if (err) writeError({ msg: 'utils.Copying error', stack: err });
        });
      } catch (err) {
        writeError({ stack: err });
      }
    }
  } else {
    log('Info: No copy to directory');
  }

  if (config.moveTo.length) {
    try {
      fs.copyFile(downloadsDestFilename, `${config.moveTo}/${file}`, (err) => {
        if (err) writeError({ msg: 'Copying error', stack: err });
      });
      fs.unlink(downloadsDestFilename, (unlinkErr) => {
        if (unlinkErr) writeError({ msg: 'Removing error', stack: unlinkErr });
      });
    } catch (err) {
      writeError({ stack: err });
    }
  } else {
    log('Info: No move to directory');
  }
}
