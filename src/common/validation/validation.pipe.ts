import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

/**
 * -----------------------------------------------------------------------------
 * أنبوب التحقق العام للتطبيق (AppValidationPipe)
 * -----------------------------------------------------------------------------
 * مسؤول عن التحقق التلقائي من صحة البيانات القادمة من العميل (Request Payloads)
 * وتحويلها لكائنات DTO وفقاً للقواعد المعرفة عبر class-validator.
 *
 * الخيارات المجهزة:
 * 1. whitelist: true
 *    - يتجاهل ويحذف تلقائياً أي حقول إضافية غير معرفة داخل الـ DTO لمنع التمرير غير المصرح به.
 * 2. transform: true
 *    - يقوم بتحويل الـ JSON العادي إلى Instance حقيقي من صنف الـ DTO.
 * 3. transformOptions.enableImplicitConversion: true
 *    - يحول الأنواع البدائية تلقائياً (مثل تحويل "true" النصي في الـ Query إلى boolean).
 *
 * للتعديل:
 * يمكنك تمرير خيارات إضافية عند الاستدعاء لتجاوز الإعدادات الافتراضية.
 */
export class AppValidationPipe extends ValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super({
      // تنقية الحقول غير المصرح بها
      whitelist: true,

      // تحويل البيانات لنماذج الكائنات المناسبة
      transform: true,

      // عدم رفض الطلب إذا وُجدت حقول زائدة (فقط يحذفها بأمان)
      forbidNonWhitelisted: false,

      // تحويل الأنواع التلقائي
      transformOptions: {
        enableImplicitConversion: true,
      },

      // دمج أي خيارات إضافية تمررها أثناء الاستخدام
      ...options,
    });
  }
}
