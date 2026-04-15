import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'
import { UserRole } from 'src/common/enums/user-role.enum';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService
    ) {}

    async register(email: string, password: string, role: UserRole) {
        const passwordHash = await bcrypt.hash(password, 10)
        return this.usersService.createUser(email, passwordHash, role)
    }

    async login(email: string, password: string) {
        const user = await this.usersService.findByEmail(email)
        if(!user) throw new UnauthorizedException('Invalid credentials')

        const valid = await bcrypt.compare(password, user.passwordHash)
        if(!valid) throw new UnauthorizedException('Invalid credentials')

        const payload = {
            sub: user.id,
            role: user.role
        }

        return {
            access_token: await this.jwtService.signAsync(payload)
        }
    }

}
