import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from 'src/common/enums/user-role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async createUser(email: string, passwordHash: string, role: UserRole) {
        const exists = await this.prisma.user.findUnique({ where: {email} })
        if(exists) {
            throw new ConflictException('Email already exists')
        }

        return this.prisma.user.create({
            data: {
                email,
                passwordHash,
                role,
                status: UserStatus.ACTIVE
            },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                createdAt: true
            }
        })
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({where: {email}})
    }

    async findById(id: number) {
        const user = await this.prisma.user.findMany({
            where: {id},
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                createdAt: true
            }
        })
        if (!user) throw new NotFoundException('User not found');
        return user
    }
}
