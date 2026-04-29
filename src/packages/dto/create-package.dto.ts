import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreatePackageDto {
  @ApiProperty({ example: 2.5, description: 'Weight in kg' })
  @IsNumber()
  @IsPositive()
  weight: number;

  @ApiProperty({ example: '40x30x20cm', description: 'LxWxH format' })
  @IsString()
  @MaxLength(50)
  dimensions: string;
}