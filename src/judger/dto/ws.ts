export interface Message {
    type: "req" | "res";
    seq: number; // u32
    time: string; // RFC3339
    body: unknown;
}

export interface Request<M extends Method, A = Args> extends Message {
    type: "req";
    body: {
        method: M; // RPC method name
        args: A; // RPC arguments
    };
}

export interface Response<R = unknown> extends Message {
    type: "res";
    body:
        | {
              output: R; // RPC output
          }
        | {
              error: ErrorInfo;
          };
}

// ------------------------------------------------------------------
export interface JudgeArgs {
    id: string;
    data?: File;
    dynamicFiles?: DynamicFile[];
    judge: Judge;
    test?: {
        cases: TestCase[];
        policy: TestPolicy;
    };
}

export type JudgeRequest = Request<"Judge", JudgeArgs>;

export type JudgeResponse = Response<null>;

// ------------------------------------------------------------------
export interface ExitArgs {
    reboot: boolean;
    rebootDelay?: number; // milliseconds
    reason?: string;
}

export type ExitRequest = Request<"Exit", ExitArgs>;

export type ExitResponse = Response<null>;

// ------------------------------------------------------------------
export interface LogArgs {
    level: "warn" | "error";
    code: number;
    message: string;
}

export type LogRequest = Request<"Log", LogArgs>;

export type LogResponse = Response<null>;

// ------------------------------------------------------------------
export interface ControlArgs {
    statusReportInterval: number; // milliseconds
}

export type ControlRequest = Request<"Control", ControlArgs>;

export type ControlResponse = Response<null>;

// ------------------------------------------------------------------
export interface ReportStatusArgs {
    collectTime: string;
    nextReportTime: string;
    report: StatusReport;
}

export type ReportStatusRequest = Request<"ReportStatus", ReportStatusArgs>;

export type ReportStatusResponse = Response<null>;

// ------------------------------------------------------------------
export type UpdateJudgesArgs = {
id: string;
state: JudgeState;
}[];

export type UpdateJudgesRequest = Request<"UpdateJudges", UpdateJudgesArgs>;

export type UpdateJudgesResponse = Response<null>;

// ------------------------------------------------------------------
export type FinishJudgesArgs = {
    id: string;
    result: JudgeResult;
}[];

export type FinishJudgesRequest = Request<"FinishJudges", FinishJudgesArgs>;

export type FinishJudgesResponse = Response<null>;

// ------------------------------------------------------------------
export type JudgerMethod = "Judge" | "Exit" | "Control";

export type ControllerMethod =
    | "Exit"
    | "Log"
    | "ReportStatus"
    | "UpdateJudges"
    | "FinishJudges";

export type Method = JudgerMethod | ControllerMethod;

export type JudgerArgs = JudgeArgs | ExitArgs | ControlArgs;

export type ControllerArgs =
    | ExitArgs
    | LogArgs
    | ReportStatusArgs
    | UpdateJudgesArgs
    | FinishJudgesArgs;

export type Args = JudgerArgs | ControllerArgs;

// ------------------------------------------------------------------
export type File = {
    id: string;
    hashsum?: string;
} & (
    | {
          url: string;
          authorization?: string;
      }
    | {
          content: string;
      }
);

export type DynamicFile =
    | {
          type: "builtin";
          name: string;
      }
    | {
          type: "remote";
          file: File;
          name: string;
      };

export enum TestPolicy {
    Fuse = "fuse",
    All = "all"
}

export interface TestCase {
    input: string; // file path or dynamic file identifier
    output: string; // file path or dynamic file identifier
}

export interface Limit {
    runtime: {
        memory: number; // byte
        cpuTime: number; // milliseconds
        output: number; // byte
    };
    compiler: {
        memory: number; // byte
        cpuTime: number; // milliseconds
        output: number; // byte
        message: number; // byte
    };
}

export interface Executable {
    source: File;
    environment: string; // how to compile or excute
    limit: Limit;
}

export enum JudgeType {
    Normal = "normal",
    Special = "special",
    Interactive = "interactive"
}

export type Judge =
    | {
          type: JudgeType.Normal;
          user: Executable;
      }
    | {
          type: JudgeType.Special;
          user: Executable;
          spj: Executable;
      }
    | {
          type: JudgeType.Interactive;
          user: Executable;
          interactor: Executable;
      };

export interface ErrorInfo {
    code: number;
    message?: string;
}

export interface StatusReport {
    hardware: {
        cpu: {
            percentage: number;
            loadavg?: [number, number, number];
        };
        memory: {
            percentage: number;
        };
    };
    task: {
        pending: number;
        preparing: {
            downloading: number;
            readingCache: number;
            compiling: number;
        };
        judging: number;
        finished: number;
        total: number;
    };
}

export enum JudgeState {
    Confirmed = "confirmed",
    Pending = "pending",
    Preparing = "preparing",
    Judging = "judging",
    Finished = "finished"
}

export enum JudgeResultKind {
    Accepted = "Accepted",
    WrongAnswer = "WrongAnswer",

    TimeLimitExceeded = "TimeLimitExceeded",
    MemoryLimitExceeded = "MemoryLimitExceeded",
    OutpuLimitExceeded = "OutpuLimitExceeded",
    RuntimeError = "RuntimeError",

    CompileError = "CompileError",
    CompileTimeLimitExceeded = "CompileTimeLimitExceeded",
    CompileMemoryLimitExceeded = "CompileMemoryLimitExceed",
    CompileFileLimitExceeded = "CompileFileLimitExceed",

    SystemError = "SystemError",
    SystemTimeLimitExceeded = "SystemTimeLimitExceed",
    SystemMemoryLimitExceeded = "SystemMemoryLimitExceed",
    SystemOutpuLimitExceeded = "SystemOutpuLimitExceeded",
    SystemRuntimeError = "SystemRuntimeError",
    SystemCompileError = "SystemCompileError",

    Unjudged = "Unjudged"
}

export interface JudgeCaseResult {
    kind: JudgeResultKind;
    time: number; // ms
    memory: number; // byte
    extraMessage?: string;
}

export interface JudgeResult {
    cases: JudgeCaseResult[];
    extra?: {
        user?: {
            compileMessage?: string;
            compileTime?: number; // ms
        };
        spj?: {
            compileMessage?: string;
            compileTime?: number; // ms
        };
        interactor?: {
            compileMessage?: string;
            compileTime?: number; // ms
        };
    };
}
