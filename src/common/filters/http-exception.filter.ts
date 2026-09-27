import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  BookingAlreadyCancelledException,
  BookingNotFoundException,
  SlotAlreadyBookedException,
  SlotNotFoundException,
} from '../errors/domain.exceptions';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: string[] | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body.message as string) || exception.message;
        if (Array.isArray(body.message)) {
          details = body.message;
          message = 'Validation failed';
        }
      } else {
        message = exception.message;
      }
    } else if (
      exception instanceof SlotNotFoundException ||
      exception instanceof BookingNotFoundException
    ) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
    } else if (exception instanceof SlotAlreadyBookedException) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
    } else if (exception instanceof BookingAlreadyCancelledException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    } else if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      (exception as { code: string }).code === 'P2002'
    ) {
      status = HttpStatus.CONFLICT;
      message = 'Slot is already booked';
    }

    response.status(status).json({
      error: message,
      ...(details ? { details } : {}),
      statusCode: status,
      timestamp: new Date().toISOString(),
    });
  }
}
