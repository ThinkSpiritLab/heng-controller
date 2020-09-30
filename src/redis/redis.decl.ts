import { RedisOptions } from "ioredis";
import { Options } from "generic-pool";

export interface RedisSetting extends RedisOptions, Options {}
