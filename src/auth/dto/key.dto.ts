import { IsString, IsOptional, Length, IsNotEmpty } from "class-validator";
import { KEY_LENGTH_NOT_ROOT } from "src/auth/auth.decl";
export const lengthErrorMessage = `长度必须等于${KEY_LENGTH_NOT_ROOT}`;
export class KeyPairDto {
    @IsString()
    @IsNotEmpty()
    @Length(KEY_LENGTH_NOT_ROOT, KEY_LENGTH_NOT_ROOT, {
        message: lengthErrorMessage
    })
    ak!: string;

    @IsString()
    @IsNotEmpty()
    @Length(KEY_LENGTH_NOT_ROOT, KEY_LENGTH_NOT_ROOT, {
        message: lengthErrorMessage
    })
    sk!: string;

    @IsString()
    @IsNotEmpty()
    roles!: string[];
}
