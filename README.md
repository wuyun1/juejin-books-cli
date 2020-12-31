# juejin-books-cli

导出掘金小册,生成 md 文档.

## 使用方法

```bash
# 安装工具
npm i -g juejin-books-cli

# 导出掘金小册
juejin-books-cli export https://juejin.cn/book/6844733783166418958 --token [你的掘金登录token]

```


## 开发调试

```bash
# 安装工具
git clone https://github.com/wuyun1/juejin-books-cli.git

cd juejin-books-cli

yarn install

yarn run test export https://juejin.cn/book/6844733783166418958 --token 你的掘金登录token

```
