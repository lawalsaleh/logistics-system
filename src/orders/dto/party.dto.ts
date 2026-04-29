import { ApiProperty } from "@nestjs/swagger";
import { ContactDto } from "./contact.dto";
import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { AddressDto } from "./address.dto";

export class PartyDto {
    @ApiProperty({type: ContactDto})
    @ValidateNested()
    @Type(() => ContactDto)
    contact: ContactDto


    @ApiProperty({type: AddressDto})
    @ValidateNested()
    @Type(() => AddressDto)
    address: AddressDto
}