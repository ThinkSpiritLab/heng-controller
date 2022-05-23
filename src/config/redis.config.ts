import { Expose, plainToClass, Type } from "class-transformer";
import {
    IsString,
    IsInt,
    Min,
    Max,
    Length,
    IsOptional,
    Matches,
    ValidateNested,
} from "class-validator";
import { Options } from "generic-pool";
import { RedisOptions } from "ioredis";
import { ProfileName } from "../profile-processor/profile.annoations";

export class RedisServerConfig {
    // RedisServerConfig, add more on https://www.npmjs.com/package/redis#options-object-properties
    // Here are their name in config file.

    // default: "localhost"
    @IsOptional()
    @IsString()
    @Length(0, 64)
    host!: string;

    // default: 6379
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(65535)
    port!: number;

    // default: null
    @IsOptional()
    @IsString()
    @Length(0, 64)
    username!: string;

    // default: null
    @IsOptional()
    @IsString()
    @Length(0, 64)
    password!: string;

    // default: 0
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(15)
    db!: number;

    // default: null
    @IsOptional()
    @IsString()
    @Length(0, 64)
    @Matches(RegExp("^/.+$"))
    path!: string;

    // default: ""
    @IsOptional()
    @IsString()
    @Length(0, 64)
    keyPrefix!: string;

    // default: 40
    @IsOptional()
    @IsInt()
    maxRetriesPerRequest!: number;

    // default: 10000
    @IsOptional()
    @IsInt()
    connectTimeout!: number;

    get option(): RedisServerOptions {
        return plainToClass(RedisServerOptions, this);
    }
}

export class RedisPoolConfig {
    // RedisPoolConfig, add more on https://github.com/coopernurse/node-pool#documentation
    // Here are their name in config file.

    // default: 0
    @IsOptional()
    @IsInt()
    @Min(0)
    minPoolSize!: number;

    // default: 1
    @IsInt()
    @Min(0)
    maxPoolSize!: number;

    // default: 0 -> never run.
    @IsOptional()
    @IsInt()
    @Min(0)
    runCloseIdleConnMillis!: number;

    // default: 30000
    @IsOptional()
    @IsInt()
    @Min(0)
    minIdleMillis!: number;

    get option(): RedisPoolOptions {
        return plainToClass(RedisPoolOptions, this);
    }
}

export class RedisOtherConfig {}

@ProfileName("Redis 配置")
export class RedisConfig {
    @ValidateNested()
    @Type(() => RedisServerConfig)
    server!: RedisServerConfig;

    @ValidateNested()
    @Type(() => RedisPoolConfig)
    pool!: RedisPoolConfig;

    @ValidateNested()
    @Type(() => RedisOtherConfig)
    config!: RedisOtherConfig;
}

//---------------------------------------------------------
// Here write transformations from the property name in config file to its name where it is used.
// Only need to add property which you want to transform its name.
// Please double check your spelling!!!
class RedisServerOptions implements RedisOptions {}

class RedisPoolOptions implements Options {
    // Here, 'min' is used by createPool(), and 'minPoolSize' is its name in config file.
    @Expose({ name: "minPoolSize" })
    min?: number;

    @Expose({ name: "maxPoolSize" })
    max?: number;

    @Expose({ name: "runCloseIdleConnMillis" })
    evictionRunIntervalMillis?: number;

    @Expose({ name: "minIdleMillis" })
    idleTimeoutMillis?: number;
}
//---------------------------------------------------------
