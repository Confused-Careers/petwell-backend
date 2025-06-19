import { config } from 'dotenv';
config();


if (!process.env.JWT_PRIVATE_KEY) {
  throw new Error('JWT_PRIVATE_KEY not defined in .env file');
}

if (!process.env.JWT_PUBLIC_KEY) {
  throw new Error('JWT_PUBLIC_KEY not defined in .env file');
}

export const jwtConfig = {
  privateKey: process.env.JWT_PRIVATE_KEY,
  publicKey: process.env.JWT_PUBLIC_KEY,
  signOptions: { expiresIn: '1d', algorithm: 'RS256' },
};