export function delay(ms: number): Promise<number> {
    return new Promise(resolve => {
        setTimeout(() => resolve(0), ms);
    });
}
export async function backOff(
    fun: () => Promise<unknown>,
    maxMs?: number
): Promise<void> {
    let interval = 10;
    while (true) {
        try {
            await fun();
            break;
        } catch (error) {
            if (!maxMs || interval <= maxMs) {
                await delay(interval);
                interval = interval * 2;
            } else throw error;
        }
    }
}
