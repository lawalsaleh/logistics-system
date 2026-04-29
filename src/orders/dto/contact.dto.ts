import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class ContactDto {
    @ApiProperty({example: 'Mohammad Musa'})
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    name: string

    @ApiProperty({example: '+82-10-0000-0000'})
    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    phone: string
}