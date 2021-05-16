import dotenv from 'dotenv';

dotenv.config();

const date = new Date();
const year = `${date.getFullYear()}`;
const month = `${date.getMonth() + 1}`.padStart(2, '0');

export const config = {
  copyTo: process.env.MTK_COPYTO_DIRS.split(';').map((dir) =>
    dir.replace('{{year}}', year).replace('{{month}}', month)
  ), // semicolon separated
  moveTo: process.env.MTK_MOVETO_DIR,
};

export default config;
