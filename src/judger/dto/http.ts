export interface AcquireTokenRequest {
    maxTaskCount: number,
    coreCount?: number,
    name?: string,
    systemInfo?: string,
}

export interface AcquireTokenOutput {
    token: string,
}

export interface ErrorInfo {
    code: number;
    message?: string;
}