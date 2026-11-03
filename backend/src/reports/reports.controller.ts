import { Controller, Get, ParseEnumPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MovementType } from '../common/enums';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary() {
    return this.reports.summary();
  }

  @Get('low-stock')
  @ApiQuery({ name: 'limit', required: false })
  lowStock(@Query('limit') limit?: string) {
    return this.reports.lowStock(Number(limit ?? 20));
  }

  @Get('movement-trend')
  @ApiQuery({ name: 'days', required: false })
  trend(@Query('days') days?: string) {
    return this.reports.movementTrend(Number(days ?? 30));
  }

  @Get('top-products')
  @ApiQuery({ name: 'type', enum: MovementType, required: false })
  @ApiQuery({ name: 'days', required: false })
  top(
    @Query('type', new ParseEnumPipe(MovementType, { optional: true })) type?: MovementType,
    @Query('days') days?: string,
  ) {
    return this.reports.topProducts(type ?? MovementType.OUT, Number(days ?? 30));
  }

  @Get('by-warehouse')
  byWarehouse() {
    return this.reports.stockByWarehouse();
  }
}
