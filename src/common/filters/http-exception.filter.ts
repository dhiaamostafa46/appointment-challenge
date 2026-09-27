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

/**
 * -----------------------------------------------------------------------------
 * فلتر معالجة الأخطاء الشامل (GlobalHttpExceptionFilter)
 * -----------------------------------------------------------------------------
 * يقوم باعتراض جميع الأخطاء والاستثناءات الصادرة من النظام
 * وتحويلها إلى استجابات HTTP موحدة وواضحة (JSON Response).
 *
 * جدول تحويل الأخطاء:
 * - SlotNotFoundException / BookingNotFoundException     -> 404 Not Found
 * - SlotAlreadyBookedException                            -> 409 Conflict (منع الحجز المزدوج)
 * - BookingAlreadyCancelledException                      -> 400 Bad Request
 * - Prisma P2002 Unique Constraint Violation              -> 409 Conflict
 * - HttpException (ValidationPipe)                        -> 400 Bad Request
 * - أي خطأ غير متوقع آخر                                 -> 500 Internal Server Error
 */
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // القيم الافتراضية للخطأ غير المتوقع
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'حدث خطأ داخلي في الخادم';
    let details: string[] | undefined = undefined;

    // 1. معالجة أخطاء NestJS الرسمية (مثل أخطاء التحقق DTO Validation)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body.message as string) || exception.message;
        if (Array.isArray(body.message)) {
          details = body.message;
          message = 'فشل التحقق من صحة المدخلات';
        }
      } else {
        message = exception.message;
      }
    }
    // 2. معالجة أخطاء عدم وجود العنصر (404)
    else if (
      exception instanceof SlotNotFoundException ||
      exception instanceof BookingNotFoundException
    ) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
    }
    // 3. معالجة أخطاء تعارض التزامن والحجز المزدوج (409 Conflict)
    else if (exception instanceof SlotAlreadyBookedException) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
    }
    // 4. معالجة العمليات غير المقبولة منطقياً (400 Bad Request)
    else if (exception instanceof BookingAlreadyCancelledException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    }
    // 5. حماية إضافية لقيود قاعدة البيانات الفريدة (Prisma P2002 Unique Constraint)
    else if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      (exception as { code: string }).code === 'P2002'
    ) {
      status = HttpStatus.CONFLICT;
      message = 'هذا الموعد محجوز مسبقاً ولا يمكن تكرار الحجز';
    }

    // إرجاع استجابة JSON موحدة يسهل على واجهة المستخدم قراءتها
    response.status(status).json({
      error: message,
      ...(details ? { details } : {}),
      statusCode: status,
      timestamp: new Date().toISOString(),
    });
  }
}
