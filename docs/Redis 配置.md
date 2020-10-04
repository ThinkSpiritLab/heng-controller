
<!-- @import "[TOC]" {cmd="toc" depthFrom=1 depthTo=6 orderedList=false} -->

<!-- code_chunk_output -->

- [快速上手](#快速上手)
- [配置选项](#配置选项)
- [pipeline() 和 multi()](#pipeline-和-multi)
- [连接维护](#连接维护)
- [其他功能](#其他功能)
- [ioredis.d.ts 问题](#ioredisdts-问题)

<!-- /code_chunk_output -->

# 快速上手
通过构造函数注入 RedisService：
```ts
constructor(
    private readonly redisService: RedisService
) {}
```

对于一般的非阻塞性 redis 命令，推荐使用已定义的持久化连接 `this.redisConfig.client`：
```ts
await this.redisService.client.set("KeyName", "KeyValue");
```

对于阻塞性 redis 命令，**务必**使用 redis 连接池。函数 `this.redisService.withClient` 接受一个接受 client，返回 Promise 的箭头函数（async），并返回运行结果，运行时**自动调用连接池**。
```ts
const [zset, member, score] = await this.redisService.withClient(
    async client => {
        return client.bzpopmin("myzset", 60);
    }
);
```

你也可以手动调用连接池，**务必** release：
```ts
const client = await this.redisService.acquire();
const [zset, member, score] = await client.bzpopmin("myzset", 60);
await this.redisService.release(client);
```

支持 Pipelining（pipeline()）和 Transaction（multi()）。

# 配置选项
配置选项定义位于 `./src/config/redis.config.ts`。

暂**不支持** url 格式登陆，如需使用请查看 https://github.com/luin/ioredis#connect-to-redis 有无更新。

支持 path 连接 redis，path 形如 "/tmp/redis.sock"。优先级**大于**普通参数。即使使用 path 也请填写任意合法的 host 和 port，否则会验证失败。

- Redis 参数接口为 (ioredis)Redis.RedisOptions。

  已包含基本配置，添加更多参数请参考 https://github.com/luin/ioredis 或下文。

修改时请同时修改 ./src/config/config.ts 的 DEFAULT_CONFIG 和 application.toml。

# pipeline() 和 multi()

对于**多个连续操作**可用选择使用 Pipelining（性能提升 50%-300%） 或事务（Transaction，自动调用 Pipelining，速度未知）。

Pipelining 实例 https://github.com/luin/ioredis#pipelining：
```ts
const res: Array = await client
    .pipeline()
    .set("foo", "bar")
    .get("foo", (err, result) => {
        // result == "bar"
    }) // 可以传入 callback
    .del("cc")
    .get("foo")
    .exec((err, result) => {
        // ...
    });
    // 会返回每一步操作的结果所构成的数组
    // 即 [ [ null, 'OK' ], [ null, 'bar' ], [ null, 0 ], [ null, 'bar' ] ]
```

事务实例 https://github.com/luin/ioredis#transaction
```ts
const res = await client
    .multi()
    .set("foo", "bar")
    .get("foo", (err, result) => {
        // result == "QUEUED"
    }) // 可以传入 callback
    .del("cc")
    .get("foo")
    .exec((err, result) => {
        // ...
    });
    // 会返回每一步操作的结果所构成的数组
    // [ [ null, 'OK' ], [ null, 'bar' ], [ null, 0 ], [ null, 'bar' ] ]
```

# 连接维护
一般无需考虑断连。

若断连，每个请求自动尝试重连 20 次（最长约为 42 秒），然后 throw，并丢弃此次请求，若重连成功则请求正常执行。redis-server 恢复后，之后的请求不受影响。目前未观测到因为请求过多而堵塞的情况。

通过 maxRetriesPerRequest 设置重连次数（默认 20，重连 2 次约为 6s，重连 4 次约为 10s），通过 connectTimeout 设置超时时间（默认 10000，**目前未发现作用**）。

支持自定义重连策略：https://github.com/luin/ioredis#auto-reconnect
```ts
redis = new Redis({
  // This is the default value of `retryStrategy`
    // @param times 已尝试重连次数
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000); // 目前未找到实际等待时间和这里的 delay 的函数关系。
        return delay;
    }
});
```

# 其他功能
- 官方文档 https://github.com/luin/ioredis

- 订阅：https://github.com/luin/ioredis#pubsub

- 监控 https://github.com/luin/ioredis#monitor

- 参数/结果自动转换：可以为某一操作（如 hmset）添加传入参数转换或结果转换（如 `[key1, val1, key2, val2]` 转换为 `{ key: val1, key2: v2 }`）。仅转换参数形式，便于调用，不影响实际存储内容。

  默认内置三个启用的转换：two argument transformers for `hmset` & `mset` and a reply transformer for `hgetall`。见 https://github.com/luin/ioredis#transforming-arguments--replies

- 高可用 alibaba/Sentinel：Sentinel 监控数个 redis 服务器，并返回在线/可用的 redis 服务器的配置。https://github.com/luin/ioredis#sentinel

- redis 集群：https://github.com/luin/ioredis#cluster

# ioredis.d.ts 问题
由于 ioredis 命令较多，虽然基本所有常用命令都可用，但是仍有个别命令没有写入 d.ts 文件。

如果您由于某些命令丢失而受到了困扰，仅由于代码规范问题，自建 ioredis.d.ts 未被允许。可以尝试向 [@types](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/ioredis) 发起 PR。

预估缺少以下命令（打勾为已添加）：

- [ ] bitfield
- [ ] bitop
- [ ] bitpos
- [x] bzpopmax
- [x] bzpopmin
- [ ] command
- [ ] geoadd
- [ ] geodecode
- [ ] geodist
- [ ] geoencode
- [ ] geohash
- [ ] geopos
- [ ] georadius
- [ ] georadiusbymember
- [x] hstrlen
- [ ] pubsub
- [ ] readonly
- [ ] readwrite
- [ ] replicaof
- [ ] role
- [ ] slowlog
- [ ] swapdb
- [ ] touch
- [ ] wait
- [ ] zlexcount

