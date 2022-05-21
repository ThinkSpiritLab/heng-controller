import { IsNotEmpty, IsString, IsInt, Min, Max } from "class-validator";
import { ProfileName } from "src/profile-processor/profile.annoations";

@ProfileName("服务端配置")
export class ServerConfig {
    @IsString()
    @IsNotEmpty()
    public readonly hostname!: string;

    @IsInt()
    @Min(1024)
    @Max(49151)
    public readonly port!: number;

    @IsString()
    globalPrefix!: string;
}
