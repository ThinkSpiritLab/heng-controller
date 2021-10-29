import { JudgeResult, JudgeState } from "heng-protocol";

export type Result = (
    | {
          type: "update";
          state: JudgeState;
      }
    | {
          type: "finish";
          result: JudgeResult;
      }
) & {
    taskId: string;
};
