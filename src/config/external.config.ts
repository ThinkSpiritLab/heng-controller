import { IsInt, IsPositive, Min } from "class-validator";
import { ProfileName } from "../profile-processor/profile.annoations";

@ProfileName("外部交互模块配置")
export class ExternaConfig {
    // ms
    @IsInt()
    @IsPositive()
    resultBackupExpire!: number;

    // ms
    @IsInt()
    @IsPositive()
    resultBackupRestoreInterval!: number;

    // s
    @IsInt()
    @IsPositive()
    resultBackupBlockTimeoutSec!: number;

    @IsInt()
    @Min(0)
    sendResultTimeout!: number;
}
