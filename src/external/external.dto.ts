import { Type } from "class-transformer";
import {
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    Max,
    Min,
    ValidateIf,
    ValidateNested,
} from "class-validator";
import { JudgeType, TestPolicy } from "heng-protocol";

export class File {
    @IsString()
    @IsOptional()
    hashsum?: string;
    @IsIn(["url", "direct"])
    type!: string;
    @ValidateIf((o) => o.type === "url")
    @IsUrl()
    url?: string;
    @ValidateIf((o) => o.type === "direct")
    @IsString()
    content?: string;
}

export class DynamicFile {
    @IsIn(["remote", "builtin"])
    type!: string;
    @ValidateIf((o) => o.type === "remote")
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => File)
    file?: File;
    @IsString()
    @IsNotEmpty()
    name!: string;
}

export class Environment {
    @IsString()
    @IsNotEmpty()
    language!: string;
    @IsIn(["Windows", "Linux", "Darwin"])
    system!: "Windows" | "Linux" | "Darwin";
    @IsIn(["x64", "arm", "risc-v", "powerpc", "mips"])
    arch!: "x64" | "arm" | "risc-v" | "powerpc" | "mips";
    @ValidateIf(() => false)
    options!: {
        [key: string]: string | number | boolean;
    };
}

export class RunTimeLimit {
    @IsInt()
    @Min(4 * 1024 * 1024)
    @Max(2 * 1024 * 1024 * 1024)
    memory!: number;
    @IsInt()
    @Min(200)
    @Max(60000)
    cpuTime!: number;
    @IsInt()
    @Min(4 * 1024 * 1024)
    @Max(128 * 1024 * 1024)
    output!: number;
}

export class CompilerTimeLimit {
    @IsInt()
    @Min(4 * 1024 * 1024)
    @Max(2 * 1024 * 1024 * 1024)
    memory!: number;
    @IsInt()
    @Min(200)
    @Max(60000)
    cpuTime!: number;
    @IsInt()
    @Min(4 * 1024 * 1024)
    @Max(128 * 1024 * 1024)
    output!: number;
    @IsInt()
    @Min(128)
    @Max(100 * 1024)
    message!: number;
}

export class Limit {
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => RunTimeLimit)
    runtime!: RunTimeLimit;
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => CompilerTimeLimit)
    compiler!: CompilerTimeLimit;
}

export class Executable {
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => File)
    source!: File;
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => Environment)
    environment!: Environment;
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => Limit)
    limit!: Limit;
}

export class TestCase {
    @IsString()
    @IsNotEmpty()
    input!: string;
    @IsString()
    @IsNotEmpty()
    output!: string;
}

export class Test {
    @ValidateNested({ each: true })
    @IsNotEmpty()
    @Type(() => TestCase)
    cases!: TestCase[];
    @IsIn([TestPolicy.All, TestPolicy.Fuse])
    policy!: TestPolicy;
}

export class CallbackUrls {
    @IsUrl()
    update!: string;
    @IsUrl()
    finish!: string;
}

export class Judge {
    @IsIn([JudgeType.Normal, JudgeType.Special, JudgeType.Interactive])
    type!: JudgeType;
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => Executable)
    user!: Executable;
    @ValidateIf((o) => o.type === JudgeType.Special)
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => Executable)
    spj?: Executable;
    @ValidateIf((o) => o.type === JudgeType.Interactive)
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => Executable)
    interactor?: Executable;
}

export class CreateJudgeRequestDto {
    @IsOptional()
    @ValidateNested()
    @Type(() => File)
    data?: File;
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => DynamicFile)
    dynamicFiles?: DynamicFile[];
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => Judge)
    judge!: Judge;
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => Test)
    test?: Test;
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => CallbackUrls)
    callbackUrls!: CallbackUrls;
}
