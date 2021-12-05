import { Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { RedisService } from "src/redis/redis.service";

export class Queue<T> {
    private readonly redisListKey: string;
    private readonly backupKeyPre: string;
    private Initialized = 0;

    /**
     * notice: this.expire += this.blockTimeoutSec * 1000;
     */
    constructor(
        private readonly id: string,
        private readonly redisService: RedisService,
        private readonly expire: number,
        private readonly checkInterval: number,
        private readonly blockTimeoutSec: number,
        private readonly processFunction?: (
            payload: T,
            resolve: () => Promise<number>
        ) => Promise<void>
    ) {
        this.expire += this.blockTimeoutSec * 1000;
        this.redisListKey = `queue:${id}`;
        this.backupKeyPre = `queuebackup:${id}`;
    }

    private checkInit(): void {
        if (this.Initialized !== 1) {
            throw new Error("Don't forget to call init or init multiple times");
        }
    }

    init(): void {
        setTimeout(() => {
            setInterval(() => this.restore(), this.checkInterval);
            this.restore();
        }, Math.random() * this.checkInterval);
        this.Initialized++;
    }

    async push(payload: T): Promise<void> {
        this.checkInit();
        await this.redisService.client.lpush(
            this.redisListKey,
            JSON.stringify(payload)
        );
    }

    async pop(): Promise<[T, () => Promise<number>]> {
        while (true) {
            try {
                const backupKeyName =
                    this.backupKeyPre +
                    "|" +
                    Date.now() +
                    "|" +
                    crypto.randomBytes(16).toString("hex");
                const retString = await this.redisService.withClient(client =>
                    client.brpoplpush(
                        this.redisListKey,
                        backupKeyName,
                        this.blockTimeoutSec
                    )
                );
                if (!retString) continue;
                const payload: T = JSON.parse(retString);
                const resolve = (): Promise<number> =>
                    this.redisService.client.del(backupKeyName);
                return [payload, resolve];
            } catch (error) {
                Logger.error(String(error), `Queue/${this.id}`);
            }
        }
    }

    async start(): Promise<void> {
        this.checkInit();
        if (this.processFunction === undefined)
            throw new Error("processFunction is not defined");
        while (true) {
            try {
                const [payload, resolve] = await this.pop();
                await this.processFunction(payload, resolve);
            } catch (error) {
                Logger.error(String(error), `Queue/${this.id}`);
            }
        }
    }

    async restore(): Promise<void> {
        const allBackupKeyName = await this.redisService.client.keys(
            this.backupKeyPre + "*"
        );
        for (const keyName of allBackupKeyName) {
            const timeStamp = parseInt(keyName.split("|")[1] ?? "0");
            if (Date.now() - timeStamp > this.expire) {
                Logger.debug(`restore : ${keyName}`, "Queue");
                await this.redisService.client.rpoplpush(
                    keyName,
                    this.redisListKey
                );
            }
        }
    }

    length(): Promise<number> {
        return this.redisService.client.llen(this.redisListKey);
    }
}
