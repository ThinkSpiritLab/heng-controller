import { IsPositive, IsInt } from "class-validator";
import { ProfileName } from "../profile-processor/profile.annoations";

@ProfileName("Judger 配置")
export class JudgerConfig {
    // ms
    @IsInt()
    @IsPositive()
    tokenExpire!: number;

    // s
    @IsInt()
    @IsPositive()
    listenTimeoutSec!: number;

    // ms
    @IsInt()
    @IsPositive()
    reportInterval!: number;

    // ms
    @IsInt()
    @IsPositive()
    lifeCheckInterval!: number;

    // ms
    @IsInt()
    @IsPositive()
    tokenGcInterval!: number;

    // ms
    @IsInt()
    @IsPositive()
    tokenGcExpire!: number;

    // ms
    @IsInt()
    @IsPositive()
    processPingInterval!: number;

    // ms
    @IsInt()
    @IsPositive()
    processCheckInterval!: number;

    // ms
    @IsInt()
    @IsPositive()
    flexibleTime!: number;

    // ms
    @IsInt()
    @IsPositive()
    rpcTimeout!: number;
}
