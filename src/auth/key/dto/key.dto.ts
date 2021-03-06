import { IsString, IsOptional, Length, IsNotEmpty } from "class-validator";
import { keyLength } from "src/auth/auth.decl";

export class KeyPairDto {
    @IsString()
    @IsNotEmpty()
    @Length(keyLength)
    ak!: string;

    @IsString()
    @IsNotEmpty()
    @Length(keyLength)
    sk!: string;

    @IsString()
    @IsNotEmpty()
    role!: string;
}
