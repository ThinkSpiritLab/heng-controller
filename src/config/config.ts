import {
    IsString,
    IsNotEmpty,
    IsNumber,
    Min,
    Max,
    ValidateNested
} from "class-validator";

import { Type } from "class-transformer";

export class ServerConfig {
    @IsString()
    @IsNotEmpty()
    public readonly hostname!: string;

    @IsNumber()
    @Min(1024)
    @Max(49151)
    public readonly port!: number;
}

export class Config {
    @ValidateNested()
    @Type(() => ServerConfig)
    public readonly server!: ServerConfig;
}

export const DEFAULT_CONFIG = {
    server: {
        hostname: "localhost",
        port: 6000
    }
};

export const DEFAULT_CONFIG_PATH = "application.toml";
