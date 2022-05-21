import {
    IsIn,
    IsNumber,
    IsOptional,
    IsString,
    Length,
    Max,
    MaxLength,
    Min,
} from "class-validator";
import { ROLES_ARR, ROLE } from "src/auth/auth.decl";

export class GenAddDto {
    @IsIn(ROLES_ARR)
    role!: ROLE;

    @IsString()
    @MaxLength(128)
    remark!: string;

    @IsNumber()
    @Min(1)
    @Max(10)
    quantity!: number;
}

export class DeleteDto {
    @IsString()
    @Length(1, 1024)
    ak!: string;
}

export class FindDto {
    @IsOptional()
    @IsString()
    @Length(1, 1024)
    ak?: string;

    @IsOptional()
    @IsString()
    @Length(1, 1024)
    sk?: string;

    @IsOptional()
    @IsIn(ROLES_ARR)
    role?: ROLE;
}
