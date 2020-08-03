# heng-controller

> ThinkSpirit 实验室 “众衡” 评测系统控制端

## 控制协议

“众衡” 控制协议定义于 [ThinkSpiritLab/Heng-Protocol](https://github.com/ThinkSpiritLab/Heng-Protocol)

## 主要技术

+ TypeScript：主要编程语言
+ Nestjs：Web 框架
+ Redis：数据缓存
+ WebSocket：与评测机保持长连接

## 协作开发

1. fork 本仓库到自己名下，例如：alice/heng-controller.
2. 新建一个分支，取名为要解决的问题，例如: update-readme.
3. 在自己仓库的新分支下提交代码。
4. 向原仓库发起 PR，申请合入主线。
5. 经过 review 后，新分支合入 master，贡献者可以删除新分支。
6. 贡献者从原仓库[同步代码](https://docs.github.com/cn/github/collaborating-with-issues-and-pull-requests/syncing-a-fork)，准备下一轮提交。

## 开发环境

建议使用 [vscode](https://code.visualstudio.com).

建议安装插件：

+ [eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
+ [prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
+ [markdown-preview-enhanced](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced)

## 代码风格

在提交前，请运行以下命令进行检查：

```shell
yarn run check:format
yarn run check:lint
```

每个提交中的改动应符合相同主题，符合提交信息的描述。

提交信息可以使用中文或英文。

## 文档风格

尽量遵循 [中文文案排版指北](https://github.com/sparanoid/chinese-copywriting-guidelines/blob/master/README.zh-CN.md)
