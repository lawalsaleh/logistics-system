import { ApiProperty } from "@nestjs/swagger";
import { PartyDto } from "./party.dto";
import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class CreateOrderDto {
    @ApiProperty({type: PartyDto})
    @ValidateNested()
    @Type(() => PartyDto)
    senderInfo: PartyDto

    @ApiProperty({type: PartyDto})
    @ValidateNested()
    @Type(() => PartyDto)
    receiverInfo: PartyDto
}