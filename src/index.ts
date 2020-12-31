import { ParsedArgs } from 'minimist';
import { App } from './app';

export default async ({
  cwd,
  args,
}: {
  cwd?: string;
  args?: ParsedArgs;
} = {}) => {
    let app = new App({
      cwd: cwd || process.cwd(),
      args: args || require('minimist')(process.argv.slice(2)),
    });
    app.initialize();
};
