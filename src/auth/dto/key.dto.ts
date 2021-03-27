import { IsString, IsOptional, Length, IsNotEmpty, IsArray } from "class-validator";
import { KEY_LENGTH_NOT_ROOT } from "src/auth/auth.decl";
export const lengthErrorMessage = `长度必须等于${KEY_LENGTH_NOT_ROOT}`;
export class KeyPairDTO {
    @IsString()
    @IsNotEmpty()
    @Length(KEY_LENGTH_NOT_ROOT, KEY_LENGTH_NOT_ROOT, {
        message: "ak"+lengthErrorMessage
    })
    ak!: string;

    @IsString()
    @IsNotEmpty()
    @Length(KEY_LENGTH_NOT_ROOT, KEY_LENGTH_NOT_ROOT, {
        message: "sk"+lengthErrorMessage
    })
    sk!: string;

    @IsNotEmpty()
    @IsArray()
    roles!: string[];
}
