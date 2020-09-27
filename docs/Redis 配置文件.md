# 配置文件
配置文件位于 `./src/config/redis.config.ts`。

暂**不支持** url 格式登陆，如需使用请查看 https://github.com/luin/ioredis#connect-to-redis 有无更新。

支持 path 连接 redis，path 形如 "/tmp/redis.sock"。优先级**大于**普通参数。即使使用 path 也请填写任意合法的 host 和 port，否则会验证失败。

为方便配置，连接池 RedisPool 的参数合并在 Redis 的参数内。

- Redis 参数接口为 (ioredis)Redis.RedisOptions。

  已包含基本配置，添加更多参数请参考 https://github.com/luin/ioredis 或下文。

- RedisPool 参数接口为 generic-pool.Options。

  已包含基本配置，添加更多参数请参考 https://github.com/coopernurse/node-pool#documentation。

修改时请同时修改 ./src/config/config.ts 的 DEFAULT_CONFIG 和 application.toml。

# 添加包装函数
前置条件：`import Redis = require("ioredis");`。

- 从连接池获取一个类型为 `Redis.Redis` 连接：`const client = await this.RedisPool.acquire();`。

- 调用完务必释放连接：`await this.RedisPool.release(client);`。

> 保留了一个持久 Redis 连接 `this.client`，无需 acquire 和 release，没有需求可以直接删去。

- 调用普通方法：`await client.set(key, val);`。

- 对于**多个连续操作**可用选择使用 Pipelining（据说性能提升 50%-300%） 或事务（原子操作，自动调用 Pipelining，速度未知）。

Pipelining 实例 https://github.com/luin/ioredis#pipelining：
```ts
const OperateRes: Array = await client
    .pipeline()
    .set("foo", "bar")
    .get("foo", (err, result) => {
        // result == "bar"
    }) // 可以传入 callback
    .del("cc")
    .get("foo")
    .exec();  // 这里也可以传入 callback
    // 会返回每一步操作的结果所构成的数组
    // 即 [ [ null, 'OK' ], [ null, 'bar' ], [ null, 0 ], [ null, 'bar' ] ]
```

事务实例 https://github.com/luin/ioredis#transaction
```ts
const OperateRes = await client
    .multi()
    .set("foo", "bar")
    .get("foo", (err, result) => {
        // result == "QUEUED"
    }) // 可以传入 callback
    .del("cc")
    .get("foo")
    .exec(); // 这里也可以传入 callback
    // 会返回每一步操作的结果所构成的数组
    // [ [ null, 'OK' ], [ null, 'bar' ], [ null, 0 ], [ null, 'bar' ] ]
```

# 其他功能
- 订阅：https://github.com/luin/ioredis#pubsub

- 监控 https://github.com/luin/ioredis#monitor

- 如需自定义重连策略：https://github.com/luin/ioredis#auto-reconnect
```ts
redis = new Redis({
    // This is the default value of `retryStrategy`
    // @param times 已尝试重连次数
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});
```

以下不常用

- 参数/结果自动转换：可以为某一操作（如 hmset）添加传入参数转换或结果转换（如 `[key1, val1, key2, val2]` 转换为 `{ key: val1, key2: v2 }`）。仅转换参数形式，便于调用，不影响实际存储内容。

  默认内置三个启用的转换：two argument transformers for `hmset` & `mset` and a reply transformer for `hgetall`。见 https://github.com/luin/ioredis#transforming-arguments--replies

- 高可用 alibaba/Sentinel：Sentinel 监控数个 redis 服务器，并返回在线/可用的 redis 服务器的配置。https://github.com/luin/ioredis#sentinel

- redis 集群：https://github.com/luin/ioredis#cluster