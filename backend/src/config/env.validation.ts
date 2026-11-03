import { plainToInstance, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

class EnvVars {
  @IsOptional() @IsIn(['development', 'production', 'test']) NODE_ENV = 'development';
  @IsOptional() @Type(() => Number) @IsInt() PORT = 3000;
  @IsOptional() @IsString() CORS_ORIGIN = 'http://localhost:4200';

  @IsString() DB_HOST: string;
  @Type(() => Number) @IsInt() DB_PORT: number;
  @IsString() DB_USER: string;
  @IsString() DB_PASSWORD: string;
  @IsString() DB_NAME: string;

  @IsString() @MinLength(16) JWT_SECRET: string;
  @IsOptional() @IsString() JWT_EXPIRES_IN = '1d';

  @IsOptional() @IsString() GEMINI_API_KEY?: string;
  @IsOptional() @IsString() GEMINI_MODEL = 'gemini-2.5-flash';
}

/** Fails fast at startup when a required environment variable is missing. */
export function validateEnv(config: Record<string, unknown>) {
  const env = plainToInstance(EnvVars, config, { enableImplicitConversion: true });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length) {
    throw new Error(
      'Invalid environment variables:\n' +
        errors.map((e) => ` - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`).join('\n'),
    );
  }
  return env;
}
