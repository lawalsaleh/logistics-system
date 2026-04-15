import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { UserRole } from "src/common/enums/user-role.enum";

export class RegisterDto {
    @ApiProperty()
    @IsEmail()
    email: string

    @ApiProperty()
    @IsString()
    @MinLength(6)
    password: string

    @ApiProperty({enum: UserRole})
    @IsEnum(UserRole)
    role: UserRole
}