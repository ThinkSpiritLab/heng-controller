import {
    ArgumentMetadata,
    BadRequestException,
    Injectable,
    Logger,
    PipeTransform
} from "@nestjs/common";
@Injectable()
export class StringToArrPipe implements PipeTransform {
    private readonly logger = new Logger("StringToArrPipe");
    constructor(
        private readonly belongToVals: string[],
        private readonly canNull: boolean = true
    ) {}
    //DTO首先验证然后才会交给管道验证，所以DTO无需管道？
    //自定义的一个验证规则，由于不知道或无法用Joi或其他库表示某个集合在不在另一个集合中，所以在管道中内置了一个
    async transform(value: any, metadata: ArgumentMetadata) {
        // 验证所给参数是否包含于vals，相当于一个验证规则
        this.logger.debug(`参数：${value}`);
        this.logger.debug(`应包含于：${this.belongToVals}`);

        return await this.validateStringArr(value);
    }
    // private toValidate(metatype: Function): boolean {
    //     const types: Function[] = [String, Boolean, Number, Array, Object];
    //     return !types.includes(metatype);
    // }
    private async validateStringArr(value: string): Promise<string[] | null> {
        if (!this.belongToVals) throw new Error("belongToVals丢失！");

        //这段必须放前面优先验证vals是否包含传入的值value，如果参数是string，不给belongToVals，则不需要验证，this.toValidate(metatype)=false,但如果给了vals，则要优先验证所给参数是否包含于vals
        if (value == null)
            if (this.canNull) return value;
            else
                throw new BadRequestException(
                    `Validation failed:值应在${this.belongToVals}中但为空！`
                );

        const valueArr = value.split(",");
        const valuesRequired = this.belongToVals;
        valueArr.forEach((v: string) => {
            if (!valuesRequired.includes(v)) {
                const message = `Validation failed:${v}不属于[${valuesRequired}],参数非法`;
                this.logger.error(message);
                throw new BadRequestException(`Validation failed: ${message}`);
            }
        });
        return valueArr;
    }
}
