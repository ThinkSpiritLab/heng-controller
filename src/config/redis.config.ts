import {
    IsString,
    IsNumber,
    Min,
    Max,
    Length,
    IsPositive,
    IsOptional,
    Matches
} from "class-validator";
import { ProfileName } from "src/profile-processor/profile.annoations";
import { RedisSetting } from "src/redis/redis.decl";

@ProfileName("Redis 配置")
export class RedisConfig implements RedisSetting {
    // RedisOptions, add more on https://www.npmjs.com/package/redis#options-object-properties
    @IsNumber()
    @Min(1)
    @Max(65535)
    port!: number;

    @IsString()
    @Length(0, 20)
    host!: string;

    @IsOptional()
    @IsString()
    @Length(0, 20)
    username!: string;

    @IsOptional()
    @IsString()
    @Length(0, 20)
    password!: string;

    @IsNumber()
    @Min(0)
    @Max(15)
    db!: number;

    @IsOptional()
    @IsString()
    @Length(0, 30)
    @Matches(RegExp("^/.+$"))
    path!: string;

    @IsOptional()
    @IsString()
    @Length(0, 20)
    keyPrefix!: string;

    // RedisPoolOptions, add more on https://github.com/coopernurse/node-pool#documentation
    @IsNumber()
    @IsPositive()
    min!: number;

    @IsNumber()
    @IsPositive()
    max!: number;
}
