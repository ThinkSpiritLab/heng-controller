import { IsInt, IsPositive, IsString } from "class-validator";
import { ProfileName } from "src/profile-processor/profile.annoations";

@ProfileName("认证模块配置")
export class AuthConfig {
    @IsInt()
    @IsPositive()
    keyLengthNotRoot!: number;

    @IsInt()
    @IsPositive()
    keyLengthRootMin!: number;

    @IsInt()
    @IsPositive()
    keyLengthRootMax!: number;

    @IsString()
    rootAccessKey!: string;

    @IsString()
    rootSecretKey!: string;

    @IsInt()
    @IsPositive()
    nonceExpire!: number;

    @IsInt()
    @IsPositive()
    timeStampExpire!: number;
}
