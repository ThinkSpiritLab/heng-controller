import { IsString, IsNumber, Matches, IsPositive } from "class-validator";
import { ProfileName } from "src/profile-processor/profile.annoations";

@ProfileName("Judger 配置")
export class JudgerConfig {
    @IsString()
    @Matches(RegExp("^/"))
    webSocketPath!: string;

    // ms
    @IsNumber()
    @IsPositive()
    tokenExpire!: number;

    // s
    @IsNumber()
    @IsPositive()
    listenTimeoutSec!: number;

    // ms
    @IsNumber()
    @IsPositive()
    reportInterval!: number;

    // ms
    @IsNumber()
    @IsPositive()
    lifeCheckInterval!: number;

    // ms
    @IsNumber()
    @IsPositive()
    tokenGcInterval!: number;

    // ms
    @IsNumber()
    @IsPositive()
    tokenGcExpire!: number;

    // ms
    @IsNumber()
    @IsPositive()
    processPingInterval!: number;

    // ms
    @IsNumber()
    @IsPositive()
    processCheckInterval!: number;

    // ms
    @IsNumber()
    @IsPositive()
    flexibleTime!: number;

    // ms
    @IsNumber()
    @IsPositive()
    rpcTimeout!: number;
}
