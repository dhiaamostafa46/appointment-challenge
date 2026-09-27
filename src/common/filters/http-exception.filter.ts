import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '../errors/domain.exceptions';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected internal error occurred.';

    // 1. Custom Domain Exception
    if (exception instanceof DomainException) {
      status = exception.statusCode;
      code = exception.code;
      message = exception.message;
    }
    // 2. NestJS HttpException (ValidationPipe, BadRequest, NotFound, etc.)
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (status === HttpStatus.BAD_REQUEST) {
        code = 'VALIDATION_ERROR';
      } else if (status === HttpStatus.NOT_FOUND) {
        code = 'NOT_FOUND';
      } else if (status === HttpStatus.CONFLICT) {
        code = 'SLOT_UNAVAILABLE';
      } else {
        code = 'HTTP_ERROR';
      }

      if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        if (Array.isArray(body.message)) {
          message = body.message.join('; ');
        } else if (typeof body.message === 'string') {
          message = body.message;
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }
    }
    // 3. Prisma P2002 Unique Constraint Violation
    else if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      (exception as { code: string }).code === 'P2002'
    ) {
      status = HttpStatus.CONFLICT;
      code = 'SLOT_UNAVAILABLE';
      message = 'This slot already has an active booking.';
    }

    response.status(status).json({
      error: {
        code,
        message,
      },
    });
  }
}
