import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import commander, { Command } from 'commander';
import puppeteer from 'puppeteer-core';
import  inquirer, { Answers, Question } from 'inquirer';
import lodash from 'lodash';
import fetch from 'isomorphic-fetch';
import * as os from 'os';
import { join } from 'path';
import { existsSync, ensureDir, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'fs-extra';
import { delay } from './utils/common';

export class App {

    private program: commander.CommanderStatic;
    private package: any;
    private cwd: string;
    private cacheDir: string;
    private cacheTokenFilePath: string;
    private token: string | null = null;
    private args: string[];

    constructor(
        {
            cwd,
            args,
        }: {
            cwd: string;
            args: string[];
        }
    ) {
        this.program = commander;
        this.package = require('../package.json');
        this.cwd = cwd || process.cwd();
        this.args = args;
        this.cacheDir = os.tmpdir();
        this.cacheTokenFilePath = join(this.cacheDir, '_juejinToken');
    }

    public async initialize() {
        const commander = this.program
            .version(this.package.version, '-v, --version')
            .usage('<command> [options]');

        this.program.command('export [bookUrl]')
            .option('--disable-cache [disableCache]', '禁止缓存掘金登录 Token')
            .option('--dist [distDir]', '导出位置, 默认位置为当前目录先 dist 文件夹')
            .description('导出掘金小册')
            .action(this.exportBook);

        this.program.command('login')
            .option('--user [user]', '账号')
            .option('--pass [pass]', '密码')
            // .option('--force [force]', '强制登录')
            .description('登录掘金账号')
            .action(this.doLogin);

        this.program.command('logout')
            .description('退出掘金登录账号')
            .action(this.logout)

        this.program.command('help [command]')
            .description('usage of a specific command')
            .action(this.help);

        // process.chdir(this.cwd);
        commander.parse([process.argv[0], process.argv[1], ...this.args]);

        if (
            process.argv.length &&
            process.argv[process.argv.length - 1].includes('juejin-books-cli')
        ) {
            this.program.outputHelp();
        }
    }



    private logout = async () => {
        await this.setCache(null);



        console.log('退出登录成功!');
    }

    private getCache = async (): Promise<any> => {
        if (existsSync(this.cacheTokenFilePath)) {
            try {
                return JSON.parse(readFileSync(this.cacheTokenFilePath).toString());
            } catch (e) {
            }
        }
        return {};
    }

    private setCache = async (data: any) => {
        if (data === null) {
            unlinkSync(this.cacheTokenFilePath);
            return;
        }
        writeFileSync(this.cacheTokenFilePath, JSON.stringify({
            _t: Date.now(),
            ...data,
        }));
    }

    private fetch = async (url: string, options: any = {}) => {

        if (!this.token) {
            return null;
        }
        return fetch(url, {
            ...options,
            "headers": {
                "accept": "*/*",
                "content-type": "application/json",
                "cookie": `passport_csrf_token=${this.token}`,
                ...options.headers
            },
            "referrer": "https://juejin.cn/",
            "body": options.body ? JSON.stringify(options.body) : null,
            "method": options.method || "GET",
            "mode": "cors",
        })
            .then(d => d.json())
            .catch(error => {
                return Promise.reject(error);
            });
    }

    private exportBook = async (bookUrl: string, command: Command) => {
        console.log('正在导出掘金小册...', bookUrl);

        let userInfo: any;

        if (!this.token && !command.disableCache) {
            userInfo = (await this.getCache());
            this.token = userInfo.token;
        }

        if (!this.token) {
            userInfo = await this.doLogin(command);
            this.token = userInfo.token;
        }
        if (!this.token) {
            return;
        }

        let bookId;
        if(bookUrl) {
            const bookUrlReg = /\/book\/([\w\d]+)($|\/.*)/;
            const regResult = bookUrlReg.exec(bookUrl);
            bookId = regResult && regResult[1];
        }

        if(!bookId) {

            try {
                const data = await this.fetch("https://api.juejin.cn/booklet_api/v1/booklet/listbybuyer", {
                    "body": {
                        "user_id": userInfo.user_id,
                        "limit": 100, "cursor": "0"
                    },
                    "method": "POST"
                });
                // console.log('data:', data);

                // const data = {"err_no":0,"err_msg":"success","data":[{"booklet_id":"6844733783166418958","base_info":{"id":0,"booklet_id":"6844733783166418958","title":"你不知道的 Chrome 调试技巧","price":0,"category_id":"6809637767543259144","status":0,"user_id":"430664257120318","verify_status":2,"summary":"熟练掌握 Chrome 调试技巧，直接提升工作效率。","cover_img":"https://user-gold-cdn.xitu.io/2019/1/31/168a1fa41cd01af2?w=1300\u0026h=1820\u0026f=png\u0026s=2243311","section_count":18,"section_ids":"6844733783166418952|6844733783187390477|6844733783204167693|6844733783204167687|6844733783204167688|6844733783208361992|6844733783208361991|6844733783208361998|6844733783212556302|6844733783212572686|6844733783212589063|6844733783216750600|6844733783216766983|6844733783216750605|6844733783216766989|6844733783220944909|6844733783220961294|6844733783225139214|6844733783225139208","is_finished":1,"ctime":1551066398,"mtime":1598288853,"put_on_time":1598288852,"pull_off_time":1598288664,"finished_time":-62135596800,"recycle_bin_time":-62135596800,"verify_time":-62135596800,"submit_time":1596087057,"top_time":-62135596800,"wechat_group_img":"https://user-gold-cdn.xitu.io/15534357926718d23d7f66c3aa1a92333fdabf426703d.jpg","wechat_group_desc":"小册十姐","wechat_group_signal":"chrome2019","read_time":0,"buy_count":13629},"user_info":{"user_id":"430664257120318","user_name":"dendoink","company":"","job_title":"摸鱼小能手","avatar_large":"https://user-gold-cdn.xitu.io/2019/1/23/168799008cdf2228?w=819\u0026h=819\u0026f=jpeg\u0026s=410288","level":4,"description":"公众号-前端恶霸","followee_count":33,"follower_count":6054,"post_article_count":41,"digg_article_count":85,"got_digg_count":3981,"got_view_count":178147,"post_shortmsg_count":40,"digg_shortmsg_count":56,"isfollowed":false,"favorable_author":1,"power":5756,"study_point":0,"university":{"university_id":"0","name":"","logo":""},"major":{"major_id":"0","parent_id":"0","name":""},"student_status":0,"select_event_count":0,"select_online_course_count":0,"identity":0},"event_discount":null,"is_buy":true},{"booklet_id":"6844733754326401038","base_info":{"id":0,"booklet_id":"6844733754326401038","title":"React 实战：设计模式和最佳实践","price":2990,"category_id":"0","status":0,"user_id":"2400989094090894","verify_status":2,"summary":"深入了解 React 应用中的设计模式，总结业界验证的最佳实践，更进一步，了解React 未来新功能 Suspense 和 Hooks。","cover_img":"https://user-gold-cdn.xitu.io/2018/12/4/16779ed4b21a9fa5?w=1950\u0026h=2730\u0026f=png\u0026s=936421","section_count":21,"section_ids":"6844733754330578952|6844733754393493512|6844733754422853639|6844733754422870023|6844733754427047950|6844733754427064334|6844733754427047949|6844733754431242248|6844733754431242253|6844733754431258632|6844733754435436558|6844733754435436557|6844733754435436552|6844733754439630861|6844733754439630855|6844733754439794702|6844733754443825159|6844733754443841543|6844733754443825166|6844733754448019470|6844733754448019469|6844733754448019464","is_finished":1,"ctime":1544461873,"mtime":1598288805,"put_on_time":1598288805,"pull_off_time":1598288671,"finished_time":-62135596800,"recycle_bin_time":-62135596800,"verify_time":-62135596800,"submit_time":1596087057,"top_time":-62135596800,"wechat_group_img":"https://user-gold-cdn.xitu.io/15794288715835a1f898a9eec09e3dcfc29b6b08d2971.jpg","wechat_group_desc":"小册七姐","wechat_group_signal":"react2018","read_time":0,"buy_count":3326},"user_info":{"user_id":"2400989094090894","user_name":"程墨","company":"Hulu","job_title":"","avatar_large":"https://mirror-gold-cdn.xitu.io/168e092ea299be11b64","level":0,"description":"","followee_count":0,"follower_count":516,"post_article_count":0,"digg_article_count":0,"got_digg_count":0,"got_view_count":0,"post_shortmsg_count":25,"digg_shortmsg_count":4,"isfollowed":false,"favorable_author":0,"power":0,"study_point":0,"university":{"university_id":"0","name":"","logo":""},"major":{"major_id":"0","parent_id":"0","name":""},"student_status":0,"select_event_count":0,"select_online_course_count":0,"identity":0},"event_discount":null,"is_buy":true}],"cursor":"10","count":0,"has_more":false};

                if(data.data.length === 0) {
                    throw(new Error('您的掘金账号上面没有小册! \n   可以打开: https://juejin.cn/books 购买小册'));
                }

                const checkboxOptions = data.data.map((item: any) => ({
                    name: `${item.booklet_id} - ${item.base_info.title}`,
                    value: item.booklet_id,
                }));
                const defaultOptions = checkboxOptions[0].value;
                const prompt: inquirer.PromptModule = inquirer.createPromptModule();

                const answers: Answers = await prompt([
                    {
                        type: 'list',
                        name: 'book',
                        message: '选择小册',
                        choices: checkboxOptions,
                        default: defaultOptions,
                    }
                ]);

                bookId = answers.book;
            } catch (e) {
                console.error(e);
                process.exit(1);
            }
            
        }

        const bookInfo = await this.fetch("https://api.juejin.cn/booklet_api/v1/booklet/get", {
            "body": {
                booklet_id: bookId,
            },
            "method": "POST",
        });

        // const bookInfo: any = {"err_no":0,"err_msg":"success","data":{"booklet":{"booklet_id":"6844733783166418958","base_info":{"id":0,"booklet_id":"6844733783166418958","title":"你不知道的 Chrome 调试技巧","price":0,"category_id":"6809637767543259144","status":0,"user_id":"430664257120318","verify_status":2,"summary":"熟练掌握 Chrome 调试技巧，直接提升工作效率。","cover_img":"https://user-gold-cdn.xitu.io/2019/1/31/168a1fa41cd01af2?w=1300\u0026h=1820\u0026f=png\u0026s=2243311","section_count":18,"section_ids":"6844733783166418952|6844733783187390477|6844733783204167693|6844733783204167687|6844733783204167688|6844733783208361992|6844733783208361991|6844733783208361998|6844733783212556302|6844733783212572686|6844733783212589063|6844733783216750600|6844733783216766983|6844733783216750605|6844733783216766989|6844733783220944909|6844733783220961294|6844733783225139214|6844733783225139208","is_finished":1,"ctime":1551066398,"mtime":1598288853,"put_on_time":1598288852,"pull_off_time":1598288664,"finished_time":-62135596800,"recycle_bin_time":-62135596800,"verify_time":-62135596800,"submit_time":1596087057,"top_time":-62135596800,"wechat_group_img":"https://user-gold-cdn.xitu.io/15534357926718d23d7f66c3aa1a92333fdabf426703d.jpg","wechat_group_desc":"小册十姐","wechat_group_signal":"chrome2019","read_time":0,"buy_count":13629},"user_info":{"user_id":"430664257120318","user_name":"dendoink","company":"","job_title":"摸鱼小能手","avatar_large":"https://user-gold-cdn.xitu.io/2019/1/23/168799008cdf2228?w=819\u0026h=819\u0026f=jpeg\u0026s=410288","level":4,"description":"公众号-前端恶霸","followee_count":33,"follower_count":6054,"post_article_count":41,"digg_article_count":85,"got_digg_count":3981,"got_view_count":178147,"post_shortmsg_count":40,"digg_shortmsg_count":56,"isfollowed":false,"favorable_author":1,"power":5756,"study_point":0,"university":{"university_id":"0","name":"","logo":""},"major":{"major_id":"0","parent_id":"0","name":""},"student_status":0,"select_event_count":0,"select_online_course_count":0,"identity":0},"event_discount":null,"is_buy":true},"introduction":{"id":82078,"section_id":"6844733783166418952","title":"介绍","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"\u003ch1 class=\"heading\"\u003e免费阅读\u003c/h1\u003e\n\u003cp\u003e如果你不想购买，小册支持在线免费阅读，因为小册的本意是为了帮助更多的人了解 Chrome Devtools，免费阅读：\u003ca target=\"_blank\" href=\"https://github.com/dendoink/FrontendWingman\"\u003e仓库地址\u003c/a\u003e，欢迎 star 支持。\u003c/p\u003e\n\u003ch2 class=\"heading\"\u003e小册介绍\u003c/h2\u003e\n\u003cp\u003e这是一本关于使用 \u003ccode\u003eChrome\u003c/code\u003e 调试工具的技巧的介绍，由 Tomek 发布在 Medium上的 “Advent calendar for front-end developers” 系列为基础，翻译后，重新整合分类，改编而来。\n从不同的情景来说明应该如何搭配使用 \u003ccode\u003eChrome DevTools\u003c/code\u003e 中的小技巧，有些时候一个技巧可以节省我们很多的时间，也会让调试的过程变得更加简单直接。\u003c/p\u003e\n\u003ch2 class=\"heading\"\u003e作者介绍\u003c/h2\u003e\n\u003cp\u003eTomek Sułkowski, 来自波兰的小哥 \u003ca target=\"_blank\" href=\"https://twitter.com/sulco\"\u003eTwitter\u003c/a\u003e , \u003ccode\u003eAngular Tricity\u003c/code\u003e 联合创始人/ \u003ccode\u003eAngular\u003c/code\u003e 专家 , 在 \u003ca target=\"_blank\" href=\"https://t.co/IFU5poPEla\"\u003eMedium专栏\u003c/a\u003e 发布多篇文章, Medium \u003ccode\u003efrontend.coach\u003c/code\u003e 专栏作者，拥有 15k 关注，擅长 \u003ccode\u003eTypescript\u003c/code\u003e等前端技术。\u003c/p\u003e\n\u003ch2 class=\"heading\"\u003e译者介绍\u003c/h2\u003e\n\u003cp\u003eDendoink, 玩过1年 \u003ccode\u003eJava\u003c/code\u003e , 3 年前端, 掘金专栏作者，联合编辑。\u003c/p\u003e\n\u003ch2 class=\"heading\"\u003e授权记录\u003c/h2\u003e\n\u003cp\u003e\u003c/p\u003e\u003cfigure\u003e\u003cimg src=\"https://user-gold-cdn.xitu.io/2019/1/14/1684bc5bffdfa017?w=1482\u0026amp;h=552\u0026amp;f=jpeg\u0026amp;s=193646\"\u003e\u003cfigcaption\u003e\u003c/figcaption\u003e\u003c/figure\u003e\u003cp\u003e\u003c/p\u003e\n\u003ch2 class=\"heading\"\u003e你会学到什么？\u003c/h2\u003e\n\u003cul\u003e\n\u003cli\u003e不常用但是却高效的调试技巧。\u003c/li\u003e\n\u003cli\u003e常用的调试方法的高端玩法。\u003c/li\u003e\n\u003cli\u003e对 \u003ccode\u003eChrome DevTools\u003c/code\u003e 各个部分功能的深入理解。\u003c/li\u003e\n\u003c/ul\u003e\n\u003ch2 class=\"heading\"\u003e适宜人群\u003c/h2\u003e\n\u003cul\u003e\n\u003cli\u003e没有使用过 \u003ccode\u003eChrome DevTools\u003c/code\u003e 但是感兴趣的小伙伴。\u003c/li\u003e\n\u003cli\u003e有使用过 \u003ccode\u003eChrome\u003c/code\u003e 进行调试，但是想更加深入理解的小伙伴。\u003c/li\u003e\n\u003c/ul\u003e\n\u003ch2 class=\"heading\"\u003e购买须知\u003c/h2\u003e\n\u003col\u003e\n\u003cli\u003e这本小册的定价是 \u003ccode\u003e0.01\u003c/code\u003e 元并不代表它的价值就是 \u003ccode\u003e0.01\u003c/code\u003e 元，而是因为作者的本意是分享而非获利。\u003c/li\u003e\n\u003cli\u003e本小册为图文形式内容服务，共计 18 节；\u003c/li\u003e\n\u003cli\u003e全部文章预计 2019 年 1 月 20 日更新完成；\u003c/li\u003e\n\u003cli\u003e购买用户可享有小册永久的阅读权限；\u003c/li\u003e\n\u003cli\u003e购买用户可进入小册微信群，与作者互动；\u003c/li\u003e\n\u003cli\u003e掘金小册为虚拟内容服务，一经购买成功概不退款；\u003c/li\u003e\n\u003cli\u003e掘金小册版权归北京北比信息技术有限公司所有，任何机构、媒体、网站或个人未经本网协议授权不得转载、链接、转贴或以其他方式复制发布/发表，违者将依法追究责任；\u003c/li\u003e\n\u003cli\u003e在掘金小册阅读过程中，如有任何问题，请邮件联系 xiaoce@xitu.io\u003c/li\u003e\n\u003c/ol\u003e\n","draft_content":"","draft_title":"介绍","markdown_content":"","markdown_show":"","is_free":1,"read_time":31956,"read_count":0,"comment_count":0,"ctime":1551066398,"mtime":1593791435,"is_update":0,"draft_read_time":0,"vid":""},"sections":[{"id":77273,"section_id":"6844733783187390477","title":"写在前面","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"写在前面","markdown_content":"","markdown_show":"","is_free":1,"read_time":212,"read_count":7606,"comment_count":54,"ctime":1548904706,"mtime":1595930752,"is_update":0,"draft_read_time":0,"vid":""},{"id":77274,"section_id":"6844733783204167693","title":"通用篇 - copying \u0026 saving ","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"通用篇 - copying \u0026 saving ","markdown_content":"","markdown_show":"","is_free":0,"read_time":98,"read_count":4425,"comment_count":59,"ctime":1548904771,"mtime":1594114058,"is_update":0,"draft_read_time":0,"vid":""},{"id":77275,"section_id":"6844733783204167687","title":"通用篇 - 快捷键和通用技巧","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"通用篇 - 快捷键和通用技巧","markdown_content":"","markdown_show":"","is_free":0,"read_time":121,"read_count":3452,"comment_count":38,"ctime":1548904783,"mtime":1595931255,"is_update":0,"draft_read_time":0,"vid":""},{"id":77276,"section_id":"6844733783204167688","title":"通用篇 - 使用 Command","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"通用篇 - 使用 Command","markdown_content":"","markdown_show":"","is_free":0,"read_time":138,"read_count":3109,"comment_count":58,"ctime":1548904795,"mtime":1595917959,"is_update":0,"draft_read_time":0,"vid":""},{"id":77277,"section_id":"6844733783208361992","title":"通用篇 - 代码块的使用","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"通用篇 - 代码块的使用","markdown_content":"","markdown_show":"","is_free":0,"read_time":84,"read_count":2613,"comment_count":49,"ctime":1548904805,"mtime":1594204133,"is_update":0,"draft_read_time":0,"vid":""},{"id":77278,"section_id":"6844733783208361991","title":"console 篇 - console 中的 '$'","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"console 篇 - console 中的 '$'","markdown_content":"","markdown_show":"","is_free":0,"read_time":116,"read_count":2599,"comment_count":41,"ctime":1548904815,"mtime":1593789667,"is_update":0,"draft_read_time":0,"vid":""},{"id":77279,"section_id":"6844733783208361998","title":"console 篇 - console 的 \"bug\" ?","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"console 篇 - console 的 \"bug\" ?","markdown_content":"","markdown_show":"","is_free":0,"read_time":47,"read_count":2024,"comment_count":15,"ctime":1548904826,"mtime":1595923802,"is_update":0,"draft_read_time":0,"vid":""},{"id":77280,"section_id":"6844733783212556302","title":"console 篇 - 异步的 console","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"console 篇 - 异步的 console","markdown_content":"","markdown_show":"","is_free":1,"read_time":128,"read_count":1968,"comment_count":7,"ctime":1548904837,"mtime":1593789995,"is_update":0,"draft_read_time":0,"vid":""},{"id":77281,"section_id":"6844733783212572686","title":"console 篇 - Ninja console.log （忍者打印） ","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"console 篇 - Ninja console.log （忍者打印） ","markdown_content":"","markdown_show":"","is_free":0,"read_time":90,"read_count":1817,"comment_count":10,"ctime":1548904846,"mtime":1594284348,"is_update":0,"draft_read_time":0,"vid":""},{"id":77282,"section_id":"6844733783212589063","title":"console 篇 - 自定义格式转换器","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"console 篇 - 自定义格式转换器","markdown_content":"","markdown_show":"","is_free":0,"read_time":218,"read_count":1647,"comment_count":11,"ctime":1548904856,"mtime":1593790173,"is_update":0,"draft_read_time":0,"vid":""},{"id":77283,"section_id":"6844733783216750600","title":"console 篇 - 对象 \u0026 方法","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"console 篇 - 对象 \u0026 方法","markdown_content":"","markdown_show":"","is_free":0,"read_time":117,"read_count":1598,"comment_count":12,"ctime":1548904866,"mtime":1593790213,"is_update":0,"draft_read_time":0,"vid":""},{"id":77284,"section_id":"6844733783216766983","title":"console 篇 - console 中骚操作","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"console 篇 - console 中骚操作","markdown_content":"","markdown_show":"","is_free":0,"read_time":353,"read_count":1817,"comment_count":17,"ctime":1548904876,"mtime":1596007664,"is_update":0,"draft_read_time":0,"vid":""},{"id":77285,"section_id":"6844733783216750605","title":"Network 篇 - Network 的骚操作","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"Network 篇 - Network 的骚操作","markdown_content":"","markdown_show":"","is_free":1,"read_time":155,"read_count":2358,"comment_count":25,"ctime":1548904901,"mtime":1596009364,"is_update":0,"draft_read_time":0,"vid":""},{"id":77286,"section_id":"6844733783216766989","title":"元素面板篇 - 技巧集合","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"元素面板篇 - 技巧集合","markdown_content":"","markdown_show":"","is_free":0,"read_time":234,"read_count":1841,"comment_count":16,"ctime":1548904912,"mtime":1593790579,"is_update":0,"draft_read_time":0,"vid":""},{"id":77287,"section_id":"6844733783220944909","title":"元素面板篇 - 颜色选择器","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"元素面板篇 - 颜色选择器","markdown_content":"","markdown_show":"","is_free":0,"read_time":114,"read_count":1539,"comment_count":8,"ctime":1548904922,"mtime":1593790629,"is_update":0,"draft_read_time":0,"vid":""},{"id":77288,"section_id":"6844733783220961294","title":"Drawer 篇 - Drawer 常识","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"Drawer 篇 - Drawer 常识","markdown_content":"","markdown_show":"","is_free":0,"read_time":255,"read_count":1747,"comment_count":14,"ctime":1548904933,"mtime":1593790688,"is_update":0,"draft_read_time":0,"vid":""},{"id":77289,"section_id":"6844733783225139214","title":"Workspace 篇 - workspace 技巧","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"Workspace 篇 - workspace 技巧","markdown_content":"","markdown_show":"","is_free":0,"read_time":118,"read_count":1754,"comment_count":20,"ctime":1548904944,"mtime":1593790839,"is_update":0,"draft_read_time":0,"vid":""},{"id":77290,"section_id":"6844733783225139208","title":"结束语","user_id":"430664257120318","booklet_id":"6844733783166418958","status":1,"content":"","draft_content":"","draft_title":"结束语","markdown_content":"","markdown_show":"","is_free":0,"read_time":57,"read_count":989,"comment_count":63,"ctime":1548904956,"mtime":1596010959,"is_update":0,"draft_read_time":0,"vid":""}]}};


        let saveDir = command.distDir || join(this.cwd, 'dist', bookId);
        await ensureDir(saveDir);

        const indexContent = `
# ${bookInfo.data.booklet.base_info.title}

> ${bookInfo.data.booklet.base_info.summary}

## 目录

${bookInfo.data.sections.map((item:any) => {
    const {id, title} = item;
    return `- [${title}](./s_${id}.md)`;
}).join('\n')}

## (${bookInfo.data.introduction.title})

${bookInfo.data.introduction.content}
        `;

        await this.exportToMdFile(join(saveDir, 'index.md'), indexContent);
        
        const len = bookInfo.data.sections.length;
        let count = 0;
        for (const sectionInfo of bookInfo.data.sections) {
            count++;
            const { section_id, id, title } = sectionInfo;
            console.log(`正在下载: 第 ${count}/${len} ${title} ...`);

            const secData = await this.fetch("https://api.juejin.cn/booklet_api/v1/section/get", {
                "body": {section_id},
                "method": "POST",
            }) as any;

            const { content } = secData.data.section;

            const secFilenamePath = join(saveDir, `s_${id}.md`);

            const fileContent = `
# ${title}

${content}

            `;
            await this.exportToMdFile(secFilenamePath, fileContent);
        }

        console.log(`导出完成, 导出位置: ${realpathSync(saveDir)}`);
        

    }

    private exportToMdFile = async (filePath: string, content: string): Promise<any> => {

        writeFileSync(filePath, content)

    }


    private doLogin = async (command: Command): Promise<any> => {

        let data: any = {};
        await this.installChrome();
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto('https://juejin.cn/');

        await page.waitForSelector('.login-button');
        await page.click('.login-button');
        const switchLoginTypeSelector = '#juejin > div.global-component-box > div.auth-modal-box > form > div.panel > div.prompt-box > span';
        await page.waitForSelector(switchLoginTypeSelector);
        await page.click(switchLoginTypeSelector);
        await page.waitForSelector('input[name=loginPhoneOrEmail]');
        if(command.user) {
            console.log(command.user);
            await page.type('input[name=loginPhoneOrEmail]', command.user.split())
        }
        if(command.pass) {
            await page.type('input[name=loginPassword]', command.pass.split())
        }
        if(command.user && command.pass) {
            await page.click('#juejin > div.global-component-box > div.auth-modal-box > form > div.panel > button');
            // await page.waitForSelector('#verify-points');
            // await delay(50);
            // await require('./utils/drag').drag({page});
        }
        try {
            let myResolve: any = null;
            const eventListener = async (event: any) => {
                if (event.url().includes('api.juejin.cn/user_api/v1/user/get')) {
                    const responseData: any = await event.json();
                    myResolve && myResolve(responseData.data);
                    page.removeListener('response', eventListener);
                }
            };
            const userInfo: any = await Promise.race([
                // delay(300000),
                new Promise((resolve) => {
                    myResolve = resolve;
                    page.addListener('response', eventListener);
                })
            ]);
            if (!userInfo) {
                throw new Error('请求超时');
            }
            data = {
                ...data,
                ...userInfo,
            };
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
        data = {
            ...data,
            ...(await page.evaluate(() => {
                const tokenReg = /.*passport_csrf_token=([^;]+)(;.*|$)/;
                const token = document.cookie.replace(
                    tokenReg,
                    '$1',
                );
                return {
                    token,
                };
            }))
        };
        await page.screenshot({ path: 'example.png' });
        await browser.close();

            console.log(`登录成功!`);
            console.log(`当前用户用户ID: ${data.user_id}`);
        
        if (!command.disableCache) {
            await this.setCache(data);
        }
        return data;
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

    private noop = async (_: any) => {
    }

    private installChrome = async () => {

        await require('./install-chrome').download();

    }

}

