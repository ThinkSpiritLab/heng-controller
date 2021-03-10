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
        let status;
        if (exception instanceof HttpException) {
            message = exception.message;
            status = exception.getStatus();
        } else {
            message = `捕获到非HttpException类型错误:${exception}`;
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        const msgLog = {
            statusCode: status, // 系统错误状态
            timestamp: new Date().toISOString(), // 错误日期
            path: req.url, // 错误路由
            message: message // 错误消息内容体(争取和拦截器中定义的响应体一样)
        };
        res.status(status).json(msgLog);
    }
}
