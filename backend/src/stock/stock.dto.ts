import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  NotEquals,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { MovementType } from '../common/enums';

export class StockLineDto {
  @ApiProperty()
  @IsInt()
  productId: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

class StockDocumentBase {
  @ApiPropertyOptional({ example: 'PO-2026-0012', description: 'Generated when omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ type: [StockLineDto] })
  @ValidateNested({ each: true })
  @Type(() => StockLineDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  items: StockLineDto[];
}

/** Goods receipt (phiếu nhập) or goods issue (phiếu xuất). */
export class StockInOutDto extends StockDocumentBase {
  @ApiProperty()
  @IsInt()
  warehouseId: number;
}

export class StockTransferDto extends StockDocumentBase {
  @ApiProperty()
  @IsInt()
  fromWarehouseId: number;

  @ApiProperty()
  @IsInt()
  toWarehouseId: number;
}

export class StockAdjustDto {
  @ApiProperty()
  @IsInt()
  warehouseId: number;

  @ApiProperty()
  @IsInt()
  productId: number;

  @ApiProperty({ example: -2, description: 'Signed difference found during a stock count' })
  @IsInt()
  @NotEquals(0)
  quantity: number;

  @ApiProperty({ example: 'Stock count 2026-11: 2 units damaged' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note: string;
}

export class MovementQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MovementType })
  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  warehouseId?: number;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class StockLevelQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  warehouseId?: number;
}
