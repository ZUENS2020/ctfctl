# Changelog

## 0.1.1

- 增加 CLI 配置系统，支持 `config show/get/set/unset` 和 `setup`
- 默认后端改为 `docker`
- 默认镜像改为 `kali/rolling`
- 增加结构化 skills 系统：
  - `skill register / list / show`
  - `skill trace record / list`
  - `skill evaluate`
  - `skill propose / proposal list`
- 增加 artifact、gccmem、image、workspace destroy 等能力文档
- 收紧 npm 发布内容，只发布运行所需文件
