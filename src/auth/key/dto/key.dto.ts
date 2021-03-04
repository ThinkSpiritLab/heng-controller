import { IsString, IsOptional, Length } from "class-validator";
import { keyLength } from "src/auth/auth.decl";

export class KeyPairDto {
    @IsString()
    @Length(keyLength)
    ak!: string;

    @IsString()
    @Length(keyLength)
    sk!: string;

    @IsString()
    @IsOptional()
    role?: string;
}
