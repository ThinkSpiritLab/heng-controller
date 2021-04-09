import { Type } from "class-transformer";
import {
    ArrayNotContains,
    ArrayNotEmpty,
    buildMessage,
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
    Length,
    registerDecorator,
    ValidateNested,
    ValidationArguments,
    ValidationOptions
} from "class-validator";
import {
    KEY_LENGTH_NOT_ROOT,
    ROLE_TYPE_DIC_EXCEPT_ROOT,
    ROOT
} from "src/auth/auth.decl";

export const lengthErrorMessage = `长度必须等于${KEY_LENGTH_NOT_ROOT}`;
export class KeyPairDTO {
    @IsString()
    @IsNotEmpty()
    @Length(KEY_LENGTH_NOT_ROOT, KEY_LENGTH_NOT_ROOT, {
        message: "ak" + lengthErrorMessage
    })
    ak!: string;

    @IsString()
    @IsNotEmpty()
    @Length(KEY_LENGTH_NOT_ROOT, KEY_LENGTH_NOT_ROOT, {
        message: "sk" + lengthErrorMessage
    })
    sk!: string;

    @IsNotEmpty()
    @IsArray()
    @ArrayNotContains([ROOT])
    @IsSubSetOf(ROLE_TYPE_DIC_EXCEPT_ROOT, true)
    roles!: string[];
}
export class KeyPairArrDTO {
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => KeyPairDTO)
    readonly list!: KeyPairDTO[];
}
//根据ak和roles查询
export class KeyCriteria {
    @IsOptional()
    index?: number;

    @IsString()
    @Length(KEY_LENGTH_NOT_ROOT, KEY_LENGTH_NOT_ROOT, {
        message: "ak" + lengthErrorMessage
    })
    ak!: string;

    @IsOptional()
    @IsArray()
    @IsSubSetOf(ROLE_TYPE_DIC_EXCEPT_ROOT, true)
    roles?: string[];
}

//密钥对查询条件是密钥对，
export class KeyCriteriaArrDTO {
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => KeyCriteria)
    readonly list!: KeyCriteria[];
}
//密钥对添加条件是角色
export class RoleCriteria {
    @IsOptional()
    index?: number;
    @IsArray()
    @IsNotEmpty()
    @IsSubSetOf(ROLE_TYPE_DIC_EXCEPT_ROOT, true)
    roles!: string[];
}
export class RoleCriteriaArrDTO {
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => RoleCriteria)
    readonly list!: RoleCriteria[];
}

/**
 * @param domain
 * @param isToLowerCase
 * 验证某字符串数组是否包含于domain，若要转换为小写，则isToLowerCase=true
 */
export function IsSubSetOf(
    domain: any,
    isToLowerCase: boolean,
    validationOptions?: ValidationOptions
) {
    return (object: any, propertyName: string) => {
        registerDecorator({
            name: "IsSubSetOf",
            target: object.constructor,

            propertyName,
            constraints: [Object.values(domain)],
            options: validationOptions,

            validator: {
                validate(value: any, args: ValidationArguments) {
                    //不能修改上两层中的validationOptions
                    if (!Array.isArray(value)) return false;
                    let ok: boolean = true;
                    const domainIsArray: boolean =
                        domain instanceof Array ? true : false;
                    // console.log(args.constraints[0])
                    for (let i in value) {
                        if (typeof value[i] != "string") return false;
                        if (isToLowerCase) value[i] = value[i].toLowerCase();
                        if (domainIsArray) {
                            if (domain.includes(value[i])) ok = false;
                        } else if (!domain[value[i]]) ok = false;
                        //要把i传到外面去
                        if (!ok) {
                            break;
                        }
                    }
                    return ok;
                },
                defaultMessage: buildMessage(
                    eachPrefix =>
                        eachPrefix +
                        "$property is not a subset of $constraint1",
                    validationOptions
                )
            }
        });
    };
}
