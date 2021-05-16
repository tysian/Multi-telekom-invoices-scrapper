import chalk from 'chalk';

export const MESSAGES = {
  DEFAULT_ERROR: 'Unexpected error.',
  INVOICE_NOT_FOUND: 'Invoice not found.',
};

export const COLORS = {
  ERROR: chalk.bold.red,
  WARNING: chalk.keyword('orange'),
  SUCCESS: chalk.green,
  INFO: chalk.blue,
};
