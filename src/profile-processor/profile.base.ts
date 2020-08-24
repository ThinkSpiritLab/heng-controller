import * as _ from "lodash";
import { getProfile, vaildProfile, initProfile } from "./profile.functions";

/**
 * 所有配置文件的基类<br>
 * 任意一级的配置文件都应该直接继承此类
 */
export class ProfileBase {
    constructor() {
        const profile: Record<string, unknown> = getProfile(
            Object.getPrototypeOf(this)["constructor"]
        );
        _.merge(this, profile);
        initProfile(this);
        vaildProfile(this);
    }
}
