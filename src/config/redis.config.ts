import {
    IsString,
    IsNumber,
    Min,
    Max,
    Length,
    IsOptional,
    Matches,
    IsPositive
} from "class-validator";
import { ProfileName } from "src/profile-processor/profile.annoations";

@ProfileName("Redis 配置")
export class RedisConfig {
    // RedisServerConfig, add more on https://www.npmjs.com/package/redis#options-object-properties
    @IsString()
    @Length(0, 20)
    host!: string;

    @IsNumber()
    @Min(1)
    @Max(65535)
    port!: number;

    @IsOptional()
    @IsString()
    @Length(0, 20)
    username!: string;

    @IsOptional()
    @IsString()
    @Length(0, 20)
    password!: string;

    // default: 0
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

    // default: 40
    @IsOptional()
    @IsNumber()
    maxRetriesPerRequest!: number;

    // default: 10000
    @IsOptional()
    @IsNumber()
    connectTimeout!: number;

    // RedisPoolConfig, add more on https://github.com/coopernurse/node-pool#documentation
    // default: 0
    @IsOptional()
    @IsNumber()
    @IsPositive()
    minPoolSize!: number;

    // default: 1
    @IsNumber()
    @IsPositive()
    maxPoolSize!: number;
}
