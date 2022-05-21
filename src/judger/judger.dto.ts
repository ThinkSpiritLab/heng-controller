import {
    IsInt,
    IsOptional,
    IsPositive,
    IsString,
    Max,
    MaxLength,
    Min,
} from "class-validator";
import { HardwareStatus, StatusReport } from "heng-protocol";
import { Token, TokenStatus } from "./judger.decl";

export class GetToken {
    @IsInt()
    @IsPositive()
    maxTaskCount!: number;

    @IsOptional()
    @IsInt()
    @IsPositive()
    coreCount?: number;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    software?: string;
}

export class ExitJudger {
    @IsOptional()
    @IsString()
    @MaxLength(128)
    reason?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(86400 * 1000)
    delay?: number;
}

export interface ControllerTaskStatus {
    inQueue: number;
    inDb: number;
    cbQueue: number;
}

export interface SystemStatus {
    controller: {
        hardware: HardwareStatus;
        task: ControllerTaskStatus;
    };
    judgers: {
        wsId: string;
        info: Token;
        report?: StatusReport;
        status: TokenStatus;
    }[];
}

export interface JudgerDetail {
    info: Token;
    report?: StatusReport;
    log: string[];
    status: TokenStatus;
}
