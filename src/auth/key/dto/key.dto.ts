import { IsString,IsOptional } from "class-validator";

export class KeyPairDto {
    @IsString()
    ak!: string;

    @IsString()
    sk!: string;

    @IsString()
    @IsOptional()
    role?: string;
}
