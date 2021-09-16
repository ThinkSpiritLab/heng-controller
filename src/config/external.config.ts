import { IsInt, IsPositive } from "class-validator";
import { ProfileName } from "src/profile-processor/profile.annoations";

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
}
