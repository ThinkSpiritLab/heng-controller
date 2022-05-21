import { IsInt, IsPositive } from "class-validator";
import { ProfileName } from "src/profile-processor/profile.annoations";

@ProfileName("Scheduler 配置")
export class SchedulerConfig {
    // ms
    @IsInt()
    @IsPositive()
        illegalTaskExpire!: number;

    // ms
    @IsInt()
    @IsPositive()
        illegalTaskCleanInterval!: number;

    // ms
    @IsInt()
    @IsPositive()
        backupExpire!: number;

    // ms
    @IsInt()
    @IsPositive()
        backupRestoreInterval!: number;

    // s
    @IsInt()
    @IsPositive()
        backupBlockTimeoutSec!: number;
}
