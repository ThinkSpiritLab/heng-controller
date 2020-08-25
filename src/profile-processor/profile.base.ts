import * as _ from "lodash";
import { vaildProfile, initProfile, getProfileMeta } from "./profile.functions";
import { ProfileMeta } from "./profile.meta";
import { plainToClass } from "class-transformer";

/**
 * 根配置文件的基类<br>
 * 顶级的配置文件应该直接继承此类
 */
export class ProfileBase {
    constructor() {
        const type: {
            new (...args: unknown[]): ProfileBase;
        } = Object.getPrototypeOf(this)["constructor"];
        const meta: ProfileMeta = getProfileMeta(type);
        const profile = meta.profile;
        if (!meta.formatted) {
            meta.formatted = true;
            _.merge(profile, plainToClass(type, profile));
            initProfile(this);
            vaildProfile(this);
        }
        _.merge(this, profile);
    }
}
