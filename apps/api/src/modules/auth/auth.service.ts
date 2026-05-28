import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        organizations: {
          create: {
            role: 'OWNER',
            organization: {
              create: {
                name: dto.organizationName,
                plan: 'FREE',
              },
            },
          },
        },
      },
      include: {
        organizations: {
          include: { organization: true },
        },
      },
    });

    const org = user.organizations[0].organization;
    const tokens = await this.generateTokens(user.id, user.email, org.id, 'OWNER');

    return {
      user: { id: user.id, email: user.email, name: user.name },
      organization: { id: org.id, name: org.name, plan: org.plan },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        organizations: {
          where: dto.organizationId
            ? { organizationId: dto.organizationId }
            : undefined,
          include: { organization: true },
          take: 1,
        },
      },
    });

    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    if (user.organizations.length === 0) {
      throw new UnauthorizedException('Usuário sem organização');
    }

    const orgUser = user.organizations[0];
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      orgUser.organizationId,
      orgUser.role,
    );

    return {
      user: { id: user.id, email: user.email, name: user.name },
      organization: {
        id: orgUser.organization.id,
        name: orgUser.organization.name,
        plan: orgUser.organization.plan,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            organizations: {
              include: { organization: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const orgUser = stored.user.organizations[0];
    return this.generateTokens(
      stored.user.id,
      stored.user.email,
      orgUser.organizationId,
      orgUser.role,
    );
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string, organizationId: string) {
    const orgUser = await this.prisma.organizationUser.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: {
        user: { select: { id: true, email: true, name: true, createdAt: true } },
        organization: { select: { id: true, name: true, plan: true, timezone: true } },
      },
    });

    if (!orgUser) throw new UnauthorizedException();

    return {
      user: orgUser.user,
      organization: orgUser.organization,
      role: orgUser.role,
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    organizationId: string,
    role: string,
  ) {
    const payload = { sub: userId, email, organizationId, role };

    const accessToken = this.jwt.sign(payload);

    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const days = parseInt(refreshExpiresIn.replace('d', ''), 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { v4: uuidv4 } = await import('uuid');
    const refreshToken = uuidv4();

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
