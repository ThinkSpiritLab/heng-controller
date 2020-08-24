import { FactoryProvider, Logger } from "@nestjs/common";
import { Config, DEFAULT_CONFIG, DEFAULT_CONFIG_PATH } from "./config";
import fs from "fs-extra";
import toml from "@iarna/toml";
import lodash from "lodash";
import { plainToClass } from "class-transformer";
import { validateOrReject } from "class-validator";
import { ProgramOptions } from "./cli-options";
import program from "commander";

function getOptions(): ProgramOptions {
    return (program.opts() as unknown) as ProgramOptions;
}

export const CONFIG_TOKEN = "CONFIG";

export const ConfigProvider: FactoryProvider<Promise<Config>> = {
    provide: CONFIG_TOKEN,

    useFactory: async (): Promise<Config> => {
        const logger = new Logger("ConfigProvider");

        const options = getOptions();

        const configPath = options.config ?? DEFAULT_CONFIG_PATH;
        logger.log(`Reading config from ${configPath}`);

        try {
            const configFile = toml.parse(
                await fs.readFile(configPath, { encoding: "utf-8" })
            );
            const cli = { hostname: options.hostname, port: options.port };
            const configObject: unknown = lodash.defaultsDeep(
                {},
                cli,
                configFile,
                DEFAULT_CONFIG
            );

            const config: Config = plainToClass(Config, configObject);

            logger.log(`Config: ${JSON.stringify(config)}`);

            await validateOrReject(config);

            return config;
        } catch (err) {
            logger.error(
                `Failed to load config:\n${JSON.stringify(err, undefined, 4)}`
            );
            throw err;
        }
    }
};
