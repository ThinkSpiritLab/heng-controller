import {
    isNotEmpty,
    IsOptional,
    IsString
} from "_class-validator@0.12.2@class-validator";

export class KeyPairDto {
    @IsString()
    ak!: string;

    @IsString()
    sk!: string;

    @IsString()
    @IsOptional()
    role?: string;
}
