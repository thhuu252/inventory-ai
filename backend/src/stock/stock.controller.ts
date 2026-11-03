import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import {
  MovementQueryDto,
  StockAdjustDto,
  StockInOutDto,
  StockLevelQueryDto,
  StockTransferDto,
} from './stock.dto';
import { StockService } from './stock.service';

@ApiTags('Stock')
@ApiBearerAuth()
@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get('levels')
  @ApiOperation({ summary: 'Current quantity per product and warehouse' })
  levels(@Query() q: StockLevelQueryDto) {
    return this.stock.findLevels(q);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Stock movement history (ledger)' })
  movements(@Query() q: MovementQueryDto) {
    return this.stock.findMovements(q);
  }

  @Post('in')
  @ApiOperation({ summary: 'Goods receipt (phiếu nhập kho)' })
  receive(@Body() dto: StockInOutDto, @CurrentUser() user: AuthUser) {
    return this.stock.receive(dto, user.id);
  }

  @Post('out')
  @ApiOperation({ summary: 'Goods issue (phiếu xuất kho)' })
  issue(@Body() dto: StockInOutDto, @CurrentUser() user: AuthUser) {
    return this.stock.issue(dto, user.id);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer between warehouses' })
  transfer(@Body() dto: StockTransferDto, @CurrentUser() user: AuthUser) {
    return this.stock.transfer(dto, user.id);
  }

  @Roles(Role.MANAGER)
  @Post('adjust')
  @ApiOperation({ summary: 'Stock count adjustment (managers only)' })
  adjust(@Body() dto: StockAdjustDto, @CurrentUser() user: AuthUser) {
    return this.stock.adjust(dto, user.id);
  }
}
