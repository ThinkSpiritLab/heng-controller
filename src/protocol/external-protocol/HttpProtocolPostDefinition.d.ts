export interface BasicHttpRequest<T> {
    nonce: string;
    timestamp: number;
    body: T;
    accesskey: string;
    signature: string;
}
export interface BasicHttpResponse<T> {
    statuscode: number;
    message?: string;
    body: T;
}
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
export enum JudgeType {
    Normal = "normal",
    Special = "special",
    Interactive = "interactive"
}
export enum TestPolicy {
    Fuse = "fuse",
    All = "all"
}
export interface Limit {
    runtime: {
        memory: number;
        cpuTime: number;
        output: number;
    };
    compiler: {
        memory: number;
        cpuTime: number;
        output: number;
        message: number;
    };
}
export interface Excuteable {
    source: File;
    environment: string;
    limit: Limit;
}
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
export type Judge =
    | {
          type: JudgeType.Normal;
          user: Excuteable;
      }
    | {
          type: JudgeType.Special;
          user: Excuteable;
          spj: Excuteable;
      }
    | {
          type: JudgeType.Interactive;
          user: Excuteable;
          interactor: Excuteable;
      };
export type CallBackUrl = string;
export interface JudgeCallbackUrls {
    judgeStateCallBackUrl?: CallBackUrl;
    judgeResultCallBackUrl: CallBackUrl;
}
export interface JudgeRequest {
    taskId: string;
    data?: File;
    dynamicFiles?: DynamicFile[];
    judge: Judge;
    test?: {
        cases: {
            input: string;
            output: string;
        }[];
        policy: TestPolicy;
    };
    judgeCallbackUrls: JudgeCallbackUrls;
}
export interface ExtendJudgeRequest {
    taskId: string;
    dynamicFiles?: DynamicFile[];
    judge: Judge;
    judgeCallbackUrls?: JudgeCallbackUrls;
}
export interface CreateJudgePayload {
    mainJudge: JudgeRequest;
    extra?: ExtendJudgeRequest[];
}
export type CreateJudgeRequest = BasicHttpRequest<CreateJudgePayload>;
export type CreateJudgesResponse = BasicHttpResponse<string[]>;
