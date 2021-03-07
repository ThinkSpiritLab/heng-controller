import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus
} from "@nestjs/common";

@Catch()
export class AuthFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const context = host.switchToHttp();
        const req = context.getRequest();
        const res = context.getResponse();
        let message: string;

        const status =
            exception instanceof HttpException
                ? ((message = exception.message), exception.getStatus())
                : ((message = `捕获到非HttpException类型错误:${exception}`),
                  HttpStatus.INTERNAL_SERVER_ERROR);
        let msgLog = {
            statusCode: status, // 系统错误状态
            timestamp: new Date().toISOString(), // 错误日期
            path: req.url, // 错误路由
            message: message // 错误消息内容体(争取和拦截器中定义的响应体一样)
        };
        res.status(status).json(msgLog);
    }
}
