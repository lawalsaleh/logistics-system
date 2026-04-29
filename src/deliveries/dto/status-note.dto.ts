import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class StatusNoteDto {
  @ApiProperty({ example: 'Delivered to reception', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}