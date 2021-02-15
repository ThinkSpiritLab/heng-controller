import { IsInt, IsOptional, IsPositive, IsString } from "class-validator";

export class GetToken {
    @IsInt()
    @IsPositive()
    maxTaskCount!: number;

    @IsOptional()
    @IsInt()
    @IsPositive()
    coreCount?: number;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    software?: string;
}

