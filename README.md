# juejin-books-cli

导出掘金小册,生成 md 文档.

## 使用方法

```bash
# 安装工具
npm i -g juejin-books-cli

# 导出掘金小册
juejin-books-cli export

# 导出指定掘金小册
juejin-books-cli export https://juejin.cn/book/6844733783166418958

```

### 预览导出的小册


```bash
# 安装 md 文档预览工具
npm i -g dumi

dumi dev

```


## 开发调试

```bash

git clone https://github.com/wuyun1/juejin-books-cli.git

cd juejin-books-cli

yarn install

# 测试导出小册
yarn run test

# 阅读文档
npx dumi dev

```
