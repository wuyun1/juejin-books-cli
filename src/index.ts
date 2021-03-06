import { App } from './cli-app';

export default async ({
  cwd,
  args,
}: {
  cwd?: string;
  args?: string[];
} = {}) => {
    let app = new App({
      cwd: cwd || process.cwd(),
      args: args || process.argv.slice(2),
    });
    await app.initialize();
};
