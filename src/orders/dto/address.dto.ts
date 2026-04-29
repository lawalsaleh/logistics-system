import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class AddressDto {
    @ApiProperty({example: '123 Main Street'})
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    line1: string

    @ApiProperty({example: 'Incheon'})
    @IsString()
    @IsNotEmpty()
    @MaxLength(60)
    city: string

    @ApiProperty({example: 'KR'})
    @IsString()
    @IsNotEmpty()
    @MaxLength(2)
    country: string
}