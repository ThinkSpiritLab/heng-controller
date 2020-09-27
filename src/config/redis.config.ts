import {
    IsString,
    IsNumber,
    Min,
    Max,
    Length,
    IsOptional,
    Matches
} from "class-validator";
import { RedisOptions } from "ioredis";
import { ProfileName } from "src/profile-processor/profile.annoations";

@ProfileName("Redis 配置")
export class RedisConfig implements RedisOptions {
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

    @IsOptional()
    @IsNumber()
    maxRetriesPerRequest!: number;

    @IsOptional()
    @IsNumber()
    connectTimeout!: number;
}
