import {
    IsNumber,
    IsString,
    Length,
} from "class-validator";
import { ProfileName } from "src/profile-processor/profile.annoations";

@ProfileName("Key 配置")
export class RootKeyPairConfig {
    @IsString()
    @Length(64, 256)
    rootAccessKey!: string;
    @IsString()
    @Length(64, 256)
    rootSecretKey!: string;
}
