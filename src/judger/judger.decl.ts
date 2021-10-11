import { ErrorInfo } from "heng-protocol/internal-protocol/http";
import {
    JudgerArgs,
    JudgerMethod,
    Request
} from "heng-protocol/internal-protocol/ws";

// keyNames in redis
export const R_List_SendMessageQueue_Suf = ":WsPendingMeaaage"; // list
export const R_List_ResQueue_Suf = ":ProcessRes"; // list

export const R_Hash_ProcessLife = "ProcessLife"; // hash
export const R_Set_ProcessOwnWs_Suf = ":ProcessWs"; // set
export const R_Set_WsOwnTask_Suf = ":WsTask"; // set

export const R_Hash_AllToken = "AllToken"; // hash
export const R_Hash_AllReport = "JudgerReport"; // hash
export const R_List_JudgerLog_Suf = ":JudgerLog"; // list

export const R_Hash_UnusedToken = "UnusedToken"; // hash
export const R_Hash_OnlineToken = "OnlineToken"; // hash
export const R_Hash_DisabledToken = "DisabledToken"; // hash
export const R_Hash_ClosedToken = "ClosedToken"; // hash

export class Token {
    maxTaskCount!: number;
    coreCount?: number;
    name?: string;
    software?: string;
    ip!: string;
    createTime!: string;
}

export interface SendMessageQueueItem {
    pid: number;
    req: Request<JudgerMethod, JudgerArgs>;
    closeReason?: string;
}

export interface CallRecordItem {
    cb: (body: { output?: unknown; error?: ErrorInfo }) => void;
    timer: NodeJS.Timeout;
}

export interface WsResRecordItem {
    pid: number;
    seq: number;
}
