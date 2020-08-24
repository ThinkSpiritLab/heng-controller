import { Injectable, Inject } from "@nestjs/common";
import { Config, ServerConfig } from "../config/config";
import { CONFIG_TOKEN } from "./config.provider";

@Injectable()
export class ConfigService {
    constructor(@Inject(CONFIG_TOKEN) private readonly config: Config) {}

    getConfig(): Config {
        return this.config;
    }

    getServerConfig(): ServerConfig {
        return this.config.server;
    }
}
