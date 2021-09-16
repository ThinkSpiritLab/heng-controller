import { Type } from "class-transformer";
import {
    ArrayNotEmpty,
    Equals,
    IsArray,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    Length,
    ValidateNested
} from "class-validator";
import {
    KEY_LENGTH_NOT_ROOT,
    KEY_LENGTH_ROOT_MAX,
    KEY_LENGTH_ROOT_MIN,
    ROLES_EXCEPT_ROOT,
    ROOT
} from "src/auth/auth.decl";

export const LENGTH_ERROR_MESSAGE = `长度必须等于${KEY_LENGTH_NOT_ROOT}`;
export class KeyPairDTO {
    @IsString()
    @IsNotEmpty()
    @Length(KEY_LENGTH_NOT_ROOT, KEY_LENGTH_NOT_ROOT, {
        message: "ak" + LENGTH_ERROR_MESSAGE
    })
    ak!: string;

    @IsString()
    @IsNotEmpty()
    @Length(KEY_LENGTH_NOT_ROOT, KEY_LENGTH_NOT_ROOT, {
        message: "sk" + LENGTH_ERROR_MESSAGE
    })
    sk!: string;

    @IsNotEmpty()
    @IsString()
    @IsIn(ROLES_EXCEPT_ROOT)
    role!: string;
}
export class RootKeyPairDTO {
    @IsString()
    @IsNotEmpty()
    @Length(KEY_LENGTH_ROOT_MIN, KEY_LENGTH_ROOT_MAX)
    ak!: string;

    @IsString()
    @IsNotEmpty()
    @Length(KEY_LENGTH_ROOT_MIN, KEY_LENGTH_ROOT_MAX)
    sk!: string;

    @IsNotEmpty()
    @IsString()
    @Equals(ROOT)
    role!: string;
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
    // @IsOptional()
    // index?: number;

    @IsString()
    @Length(KEY_LENGTH_NOT_ROOT, KEY_LENGTH_NOT_ROOT, {
        message: "ak" + LENGTH_ERROR_MESSAGE
    })
    ak!: string;

    @IsOptional()
    @IsIn(ROLES_EXCEPT_ROOT)
    role?: string;
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
    // @IsOptional()
    // index?: number;

    @IsNotEmpty()
    @IsIn(ROLES_EXCEPT_ROOT)
    role!: string;
}
export class RoleCriteriaArrDTO {
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => RoleCriteria)
    readonly list!: RoleCriteria[];
}

// /**
//  * @param domain
//  * @param isToLowerCase
//  * 验证某字符串数组是否包含于 domain，若要转换为小写，则 isToLowerCase=true
//  */
// export function IsSubSetOf(
//     domain: any,
//     isToLowerCase: boolean,
//     validationOptions?: ValidationOptions
// ) {
//     return (object: any, propertyName: string) => {
//         registerDecorator({
//             name: "IsSubSetOf",
//             target: object.constructor,

//             propertyName,
//             constraints: [Object.values(domain)],
//             options: validationOptions,

//             validator: {
//                 validate(value: any, args: ValidationArguments) {
//                     //不能修改上两层中的validationOptions
//                     if (!Array.isArray(value)) return false;
//                     let ok = true;
//                     //是数组还是字典
//                     const domainIsArray: boolean =
//                         domain instanceof Array ? true : false;
//                     // console.log(args.constraints[0])
//                     for (const i in value) {
//                         if (typeof value[i] != "string") return false;
//                         if (isToLowerCase) value[i] = value[i].toLowerCase();
//                         if (domainIsArray) {
//                             if (domain.includes(value[i])) ok = false;
//                         } else if (!domain[value[i]]) ok = false;
//                         //要把i传到外面去
//                         if (!ok) {
//                             break;
//                         }
//                     }
//                     return ok;
//                 },
//                 defaultMessage: buildMessage(
//                     eachPrefix =>
//                         eachPrefix +
//                         "$property is not a subset of $constraint1",
//                     validationOptions
//                 )
//             }
//         });
//     };
// }
