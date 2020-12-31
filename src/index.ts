import { ParsedArgs } from 'minimist';

export default async ({
  cwd,
  args,
}: {
  cwd?: string;
  args?: ParsedArgs;
} = {}) => {

    // const path = require('path');
    // const args = process.argv.slice(2);
    const argv = args || require('minimist')(process.argv.slice(2));
    
    console.log(argv);
  
};
