import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { register } from 'module';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}
    
    @Post('register')
    register(@Body() dto: RegisterDto){
        return this.authService.register(dto.email, dto.password, dto.role)
    }

    @Post('login')
    login(@Body() dto: LoginDto){
        return this.authService.login(dto.email, dto.password)
    }
}  
