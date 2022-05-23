import {
    createParamDecorator,
    BadRequestException,
    ExecutionContext,
} from "@nestjs/common";

export const IntQuery = createParamDecorator((data, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const id = parseInt(req.query[data], 10);
    if (Number.isInteger(id)) return id;
    else throw new BadRequestException(`Query ${data} should be integer`);
});

export const OptionalIntQuery = createParamDecorator(
    (data, ctx: ExecutionContext) => {
        const req = ctx.switchToHttp().getRequest();
        const id = parseInt(req.query[data], 10);
        if (!id) return undefined;
        if (Number.isInteger(id)) return id;
        else throw new BadRequestException(`Query ${data} should be integer`);
    }
);

export const IntParam = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const req = ctx.switchToHttp().getRequest();
        const id = parseInt(req.params[data], 10);
        if (Number.isInteger(id)) return id;
        else throw new BadRequestException(`Param ${data} should be integer`);
    }
);
