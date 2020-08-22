export class Profile {
    constructor() {
        for (const key in Object.getPrototypeOf(this)) {
            if (!key.startsWith("_")) {
                Object.defineProperty(this, key, {
                    value: Object.getPrototypeOf(this)[key]
                });
            }
        }
        deepFreeze(<Record<string, unknown>>this);
    }
}

/**
 * 实现深冻结
 * @param target 目标，被深冻结后，对象将无法改变
 */
function deepFreeze(target: Record<string, unknown>): void {
    Object.freeze(target);
    for (const key in target) {
        if (typeof target[key] === "object") {
            if (!Object.isFrozen(target[key])) {
                deepFreeze(<Record<string, unknown>>target[key]);
            }
        }
    }
}
