import {
    ArgumentMetadata,
    BadRequestException,
    Injectable,
    Logger,
    PipeTransform
} from "@nestjs/common";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";

@Injectable()
export class AuthPipe implements PipeTransform {
    private readonly logger = new Logger("AuthPipe");
    constructor(private readonly belongToVals?: string[]) {}
    async transform(value: any, { metatype }: ArgumentMetadata) {
        // 验证所给参数是否包含于vals，相当于一个验证规则
        // this.logger.debug(value);
        if (this.belongToVals) {
            //这段必须放前面优先验证vals是否包含传入的值value，如果参数是string，不给belongToVals，则不需要验证，this.toValidate(metatype)=false,但如果给了vals，则要优先验证所给参数是否包含于vals
            if (!value)
                throw new BadRequestException(
                    `Validation failed:值应在${this.belongToVals}中但为空！`
                );

            const valueArr = value.split(",");
            const valuesRequired = this.belongToVals;
            valueArr.forEach((v: string) => {
                if (!valuesRequired.includes(v)) {
                    const message = `Validation failed:${v}不属于[${valuesRequired}],参数非法`;
                    this.logger.error(message);
                    throw new BadRequestException(message);
                }
            });
            return value;
        }
        if (!metatype || !this.toValidate(metatype)) {
            // 如果没有传入验证规则，则不验证，直接返回数据
            return value;
        }
        //自定义的一个验证规则，由于不知道或无法用Joi或其他库表示某个集合在不在另一个集合中，所以在管道中内置了一个

        // 将对象转换为 Class 来验证
        const object = plainToClass(metatype, value);
        const keys = Object.keys(value);
        for (const k of keys) {
            const isNumber: boolean = k.toLowerCase().indexOf("count") != -1;
            //key中含count,则参数名是count，则一定是number类型
            if (isNumber && typeof value[k] != "number") {
                throw new BadRequestException(
                    `Validation failed:${k}应为number类型,但传入${typeof value[
                        k
                    ]}`
                );
            }
        }
        this.logger.debug(metatype);
        validate(object);
        try {
        } catch (error) {
            this.logger.debug(error);
            // if (error.length > 0) {
            //     const msg = Object.values(errors[0])[0]; // 只需要取第一个错误信息并返回即可
            //     this.logger.error(`Validation failed: ${msg}`);
            throw new BadRequestException(`Validation failed: ${error}`);
            // }
        }
        return value;
    }

    private toValidate(metatype: any): boolean {
        const types: any[] = [String, Boolean, Number];
        return !types.includes(metatype);
    }
}
