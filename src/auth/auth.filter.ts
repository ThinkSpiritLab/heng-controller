// import {
//     ArgumentsHost,
//     Catch,
//     ExceptionFilter,
//     HttpException,
//     HttpStatus,
//     Logger
// } from "@nestjs/common";

// @Catch()
// export class AuthFilter implements ExceptionFilter {
//     private logger = new Logger("AuthFilter");
//     catch(exception: HttpException, host: ArgumentsHost) {
//         this.logger.debug("went into filter");
//         const context = host.switchToHttp();
//         const req = context.getRequest();
//         const res = context.getResponse();
//         let message: string;
//         let status;
//         if (exception instanceof HttpException) {
//             message = Object(exception.getResponse()).message;
//             status = exception.getStatus();
//         } else {
//             message = `捕获到非HttpException类型错误:${exception}`;
//             status = HttpStatus.INTERNAL_SERVER_ERROR;
//         }
//         const msgLog = {
//             statusCode: status, // 系统错误状态
//             timestamp: new Date().toLocaleString(), // 错误日期
//             path: req.url, // 错误路由
//             message: message // 错误消息内容体(争取和拦截器中定义的响应体一样)
//         };
//         res.json(msgLog);
//     }
// }
