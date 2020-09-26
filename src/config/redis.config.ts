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
import { ClientOpts } from "redis";
import { ProfileName } from "src/profile-processor/profile.annoations";

@ProfileName("Redis 配置")
export class RedisConfig implements ClientOpts {
    // RedisOptions, add more on https://www.npmjs.com/package/redis#options-object-properties
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(65535)
    port!: number;

    @IsOptional()
    @IsString()
    @Length(0, 20)
    host!: string;

    @IsOptional()
    @IsString()
    @Length(0, 20)
    password!: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(15)
    db!: number;

    // The previous four items or this item must be set,
    //and should not be set at the same tine.
    @IsOptional()
    @IsString()
    @Matches(
        RegExp(
            "^redis[s]?://([\\w]{0,20}(:[\\S]{1,20}@))?[\\w.]{1,20}:[\\d]{1,5}(/[\\d]{1,2})?$"
        )
    )
    //                redis://     user        :password@      host        :port       /db
    url!: string;

    @IsOptional()
    @IsString()
    @Length(0, 10)
    prefix!: string;

    // RedisPoolOptions, add more on https://github.com/coopernurse/node-pool#documentation
    @IsNumber()
    @IsPositive()
    min!: number;

    @IsNumber()
    @IsPositive()
    max!: number;
}
