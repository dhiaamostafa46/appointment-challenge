import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public isConnected = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
    } catch {
      console.warn('⚠️  PostgreSQL is not reachable locally. Operating in memory-safe fallback mode.');
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
