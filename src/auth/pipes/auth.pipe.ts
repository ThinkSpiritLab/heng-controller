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
    constructor(private readonly schema?: unknown) {}
    private readonly logger = new Logger("ValidationPipe");
    transform(value: any, { metatype }: ArgumentMetadata) {
        this.logger.debug("went into AuthPipe");
        const keys = Object.keys(value);
        //keys中含count,则参数名是count，则一定是number且为整数
        this.validateCount(value, keys);
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }

        // if (value.list) return value.list;
        if (this.schema) this.logger.debug(`has schema:${this.schema}`);
        const object = plainToClass(metatype, value);
        const errors = validate(object, this.schema);
        if (errors) {
            throw new BadRequestException("Validation failed");
        }
    }

    private toValidate(metatype: any): boolean {
        const types = [String, Boolean, Number, Array, Object];
        return !types.includes(metatype);
    }
    private validateCount(incommingValue: any, keys: string[]) {
        for (const k of keys) {
            const isNumber: boolean = k.toLowerCase().indexOf("count") != -1;

            if (isNumber && typeof incommingValue[k] != "number") {
                throw new BadRequestException(
                    `Validation failed:${k}应为number类型,但传入${typeof incommingValue[
                        k
                    ]}`
                );
            }
        }
    }
}
