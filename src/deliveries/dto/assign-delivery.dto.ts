import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AssignDeliveryDto {
  @ApiProperty({ example: 10, description: 'Package ID to create/assign delivery for' })
  @IsInt()
  @Min(1)
  packageId: number;

  @ApiProperty({ example: 3, description: 'Driver user ID' })
  @IsInt()
  @Min(1)
  driverId: number;
}
