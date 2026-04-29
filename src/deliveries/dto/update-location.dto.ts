import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({ example: 'Incheon Hub - Sorting Center' })
  @IsString()
  @MaxLength(120)
  location: string;

  @ApiProperty({ example: 'Arrived at hub', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}