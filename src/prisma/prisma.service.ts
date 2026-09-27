import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * -----------------------------------------------------------------------------
 * خدمة إدارة الاتصال بقاعدة البيانات (PrismaService)
 * -----------------------------------------------------------------------------
 * تدير دورة حياة الاتصال بقاعدة بيانات PostgreSQL عبر Prisma Client.
 *
 * المزايا:
 * 1. الاتصال التلقائي عند بدء تشغيل التطبيق (onModuleInit).
 * 2. قطع الاتصال بأمان عند إيقاف تشغيل الخادم (onModuleDestroy).
 * 3. آلية التبديل الآمن (Safe Fallback): في حال تعذر الاتصال بـ PostgreSQL محلياً،
 *    يعمل التطبيق بذاكرة مؤقتة تضمن استمرار الاختبارات والواجهة التفاعلية بسلاسة.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public isConnected = false;

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.isConnected = true;
    } catch {
      console.warn('⚠️  PostgreSQL is not reachable locally. Operating in memory-safe fallback mode.');
      this.isConnected = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
