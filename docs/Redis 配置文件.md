# 配置文件
配置文件 ./src/config/redis.config.ts，由于 url 包含了 port、host、password、db 等，所以**不建议**两类参数同时设置（未测试同时设置的后果），同时目前各参数设置为 **IsOptional** 状态，如不需要 url 可以砍掉。

Redis 添加更多参数请参考 https://www.npmjs.com/package/redis#options-object-properties

RedisPool 添加更多参数请参考 https://github.com/coopernurse/node-pool#documentation

修改时请同时修改 ./src/config/config.ts 的 DEFAULT_CONFIG 和 application.toml。