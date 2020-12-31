import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import commander, { Command } from 'commander';
import { ParsedArgs } from 'minimist';

export class App {

    private program: commander.CommanderStatic;
    private package: any;
    private cwd: string;
    private args: ParsedArgs;

    constructor(
        {
            cwd,
            args,
        }: {
            cwd: string;
            args: ParsedArgs;
        }
    ) {
        this.program = commander;
        this.package = require('../package.json');
        this.cwd = cwd;
        this.args = args;
    }

    public initialize() {
        const commander = this.program
            .version(this.package.version, '-v, --version')
            .usage('<command> [options]');

        this.program.command('write [message]')
            .option('-m, --message [value]', 'Say hello!')
            .description('write description')
            .action(this.write)

        this.program.command('export [bootUrl]')
            .option('--token [token]', '掘金登录 Token')
            .description('导出掘金小册')
            .action(this.exportBook)

        this.program.command('write2 [message]')
            .option('-m2, --message2 [value]', 'Say hello2!')
            .description('write2 description')
            .action(this.write2);

        this.program.command('help [command]')
            .description('usage of a specific command')
            .action(this.help);

        commander.parse(process.argv);

        if (
            process.argv.length &&
            process.argv[process.argv.length - 1].includes('juejin-books-cli')
        ) {
            this.program.outputHelp();
        }
    }

    private write = async (inputStr: string, command: Command) => {
        console.log(inputStr, command.message);
    }

    private exportBook = async (bootUrl: string, command: Command) => {
        console.log('正在导出掘金小册...',bootUrl, command.token);
    }

    private write2 = async (inputStr: string = '', command: Command) => {
        console.log(inputStr, command.message, command.message2);
    }

    private help = async (cmdName: string = '', commandOptions: Command) => {
        if (!cmdName) {
            this.program.outputHelp();
            return;
        }
        // program.outputHelp()
        await new Promise((resolve, reject) => {
            const options: SpawnOptions = {
                stdio: 'pipe',
                shell: true,
            };
            // hzero-cli ${cmdName} --help
            const child: ChildProcess = spawn(
                `node`,
                [require.resolve('../bin/juejin-books-cli.js'), cmdName, '--help'],
                options
            );
            child.stdout!.pipe(process.stdout);
            if (child.stderr) {
                child.stderr!.pipe(process.stderr);
            }
            child.on('close', code => {
                if (code === 0) {
                    resolve(code);
                } else {
                    reject(code);
                }
            });
            resolve(0);
        });
    }

}

