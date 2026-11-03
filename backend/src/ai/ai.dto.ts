import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  content: string;
}

export class AskDto {
  @ApiProperty({ example: 'Sản phẩm nào sắp hết hàng?' })
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  question: string;

  @ApiPropertyOptional({ type: [ChatMessageDto], description: 'Previous turns, for follow-up questions' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  @ArrayMaxSize(20)
  history?: ChatMessageDto[];
}
