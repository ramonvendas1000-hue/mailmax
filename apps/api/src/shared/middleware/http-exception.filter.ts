import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Erro interno do servidor';

    const details =
      exception instanceof HttpException
        ? (exception.getResponse() as any)?.message
        : undefined;

    response.status(status).send({
      success: false,
      error: {
        code: status,
        message,
        details: Array.isArray(details) ? details : undefined,
      },
    });
  }
}
