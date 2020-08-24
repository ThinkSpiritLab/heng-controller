import program from "commander";
import { DEFAULT_CONFIG, DEFAULT_CONFIG_PATH } from "./config";

/** 命令行参数类型 */
export interface ProgramOptions {
    config: string;
    hostname?: string;
    port?: number;
}

export async function parseCommand(): Promise<void> {
    program
        .name("heng-controller")
        .option(
            "-c, --config <path>",
            `config path [defalut: ${DEFAULT_CONFIG_PATH}]`
        )
        .option(
            "-h, --hostname <string>",
            `hostname [default: ${DEFAULT_CONFIG.server.hostname}]`
        )
        .option(
            "-p, --port <number>",
            `port [defalut: ${DEFAULT_CONFIG.server.port}]`,
            parseInt
        );

    await program.parseAsync(process.argv);
}
