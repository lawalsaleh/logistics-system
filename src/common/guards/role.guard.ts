import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from "../decorators/role.decorator";

@Injectable()
export class RoleGuard implements CanActivate {
    constructor(private reflector: Reflector){}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(
            ROLE_KEY,
            [context.getHandler(), context.getClass()]
        )

        if(!requiredRoles) return true

        const {user} = context.switchToHttp().getRequest()
        return requiredRoles.includes(user.role)
    }
}