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
        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;
        let message =
            status == HttpStatus.INTERNAL_SERVER_ERROR
                ? "错误非Http类型!"
                : exception.message;
        let msgLog = {
            statusCode: status, // 系统错误状态
            timestamp: new Date().toISOString(), // 错误日期
            path: req.url, // 错误路由
            message: "请求失败!",
            data: message // 错误消息内容体(争取和拦截器中定义的响应体一样)
        };
        res.status(status).json(msgLog);
    }
}
