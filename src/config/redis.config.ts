import { Expose, plainToClass, Type } from "class-transformer";
import {
    IsString,
    IsNumber,
    Min,
    Max,
    Length,
    IsOptional,
    Matches,
    ValidateNested
} from "class-validator";
import { Options } from "generic-pool";
import { RedisOptions } from "ioredis";
import { ProfileName } from "src/profile-processor/profile.annoations";

export class RedisServerConfig {
    // RedisServerConfig, add more on https://www.npmjs.com/package/redis#options-object-properties
    // Here are their name in config file.

    @IsString()
    @Length(0, 64)
    host!: string;

    @IsNumber()
    @Min(1)
    @Max(65535)
    port!: number;

    @IsOptional()
    @IsString()
    @Length(0, 64)
    username!: string;

    @IsOptional()
    @IsString()
    @Length(0, 64)
    password!: string;

    // default: 0
    @IsNumber()
    @Min(0)
    @Max(15)
    db!: number;

    @IsOptional()
    @IsString()
    @Length(0, 64)
    @Matches(RegExp("^/.+$"))
    path!: string;

    @IsOptional()
    @IsString()
    @Length(0, 64)
    keyPrefix!: string;

    // default: 40
    @IsOptional()
    @IsNumber()
    maxRetriesPerRequest!: number;

    // default: 10000
    @IsOptional()
    @IsNumber()
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
    @IsNumber()
    @Min(0)
    minPoolSize!: number;

    // default: 1
    @IsNumber()
    @Min(0)
    maxPoolSize!: number;

    // default: 0 -> never run.
    @IsOptional()
    @IsNumber()
    @Min(0)
    runCloseIdleConnMillis!: number;

    // default: 30000
    @IsOptional()
    @IsNumber()
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
