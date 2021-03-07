import { IsString, IsOptional, Length, IsNotEmpty } from "class-validator";
import { keyLength } from "src/auth/auth.decl";
export const lengthErrorMessage = `长度必须等于${keyLength}`;
export class KeyPairDto {
    @IsString()
    @IsNotEmpty()
    @Length(keyLength,100, { message: lengthErrorMessage })
    ak!: string;

    @IsString()
    @IsNotEmpty()
    @Length(keyLength,100, { message: lengthErrorMessage })
    sk!: string;

    @IsString()
    @IsNotEmpty()
    roles!: string[];
}
