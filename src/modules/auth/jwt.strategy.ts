import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConfig } from '@config/jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    if (!jwtConfig.publicKey) {
      throw new UnauthorizedException('JWT public key is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.publicKey,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, username: payload.username, entityType: payload.entityType };
  }
}