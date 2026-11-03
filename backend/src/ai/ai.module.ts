import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiClient, LLM_CLIENT } from './llm.client';

@Module({
  imports: [ReportsModule],
  controllers: [AiController],
  providers: [AiService, { provide: LLM_CLIENT, useClass: GeminiClient }],
})
export class AiModule {}
