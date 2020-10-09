import { Injectable } from "@nestjs/common";
import { Config } from "../config";
import { ServerConfig } from "../server.config";

@Injectable()
export class ConfigService {
    private readonly config: Config = new Config();

    getConfig(): Config {
        return this.config;
    }

    getServerConfig(): ServerConfig {
        return this.config.server;
    }
}
