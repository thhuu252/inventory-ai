import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'HCM-01' })
  @IsString()
  @Matches(/^[A-Z0-9-]{2,20}$/, { message: 'code must be 2-20 uppercase letters, digits or dashes' })
  code: string;

  @ApiProperty({ example: 'Kho Thu Duc' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
