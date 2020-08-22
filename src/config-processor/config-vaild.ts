import { Profile } from "./profile";

/**
 * 检验装饰字段
 */
export interface VaildFunction{
    (param:unknown):boolean
}

/**
 * 校验器标识
 */
export interface VaildMark{
    prop:string,
    vaild:VaildFunction,
    message?:string
}

/**
 * 校验器字段魔数
 */
export const VAILD_MAGIC_PROP = "_VAILD_MAGIC_";

/**
 * 自定义校验
 * @param vaildFunction 此字段的校验函数
 * @param message 校验失败的提示信息
 */
export function Vaild(vaildFunction:VaildFunction,message?:string)
:<T extends Profile>(target:T,key:string)=>void
{
    return function<T extends Profile>(target:T,key:string):void{
        const t = <Record<string,unknown>>target;
        if(!t[VAILD_MAGIC_PROP]){
            t[VAILD_MAGIC_PROP]=new Array<VaildMark>();
        }
        const arr = <Array<VaildMark>>t[VAILD_MAGIC_PROP];
        arr.push({
            prop:key,
            vaild:vaildFunction,
            message:message
        });
    };
}

/**
 * 拓展校验装饰器的函数接口
 */
export interface VaildFunctionInterface{
    <T extends Profile>(target:T,key:string):void
}

/**
 * 校验当前字段是否小于等于一定值
 * @param max 字段的最大值
 * @param message 校验失败的提示信息
 */
export function Max(max:number,message?:string):VaildFunctionInterface{
    return Vaild(v=>{return (<number>v)<=max;},message);
}

/**
 * 校验当前字段是否大于等于一定值
 * @param min 字段的最小值
 * @param message 校验失败的提示信息
 */
export function Min(min:number,message?:string):VaildFunctionInterface{
    return Vaild(v=>{return (<number>v)>=min;},message);
}


