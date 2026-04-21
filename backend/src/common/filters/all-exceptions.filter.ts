import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    let message: any = 'Terjadi kesalahan pada server';
    if (typeof exceptionResponse === 'string') message = exceptionResponse;
    else if (exceptionResponse && typeof exceptionResponse === 'object') {
      const resp: any = exceptionResponse;
      message = resp.message ?? resp.error ?? message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      path: request.url,
      method: request.method,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'production' ? undefined : exception instanceof Error ? exception.stack : undefined,
    });
  }
}
