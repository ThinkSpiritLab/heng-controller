import { IsNumber, IsPositive } from "class-validator";
import { ProfileName } from "src/profile-processor/profile.annoations";

@ProfileName("Scheduler 配置")
export class SchedulerConfig {
    // ms
    @IsNumber()
    @IsPositive()
    illegalTaskExpire!: number;

    // ms
    @IsNumber()
    @IsPositive()
    illegalTaskCleanInterval!: number;

    // ms
    @IsNumber()
    @IsPositive()
    backupExpire!: number;

    // ms
    @IsNumber()
    @IsPositive()
    backupRestoreInterval!: number;
}
