import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

/** Turns common Postgres errors into clean 4xx responses instead of 500s. */
@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError & { code?: string; detail?: string }, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const map: Record<string, [number, string]> = {
      '23505': [HttpStatus.CONFLICT, 'Duplicate value'],
      '23503': [HttpStatus.CONFLICT, 'Record is referenced by other data'],
      '23514': [HttpStatus.BAD_REQUEST, 'Constraint violated'],
    };
    const [status, message] = map[exception.code ?? ''] ?? [
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Database error',
    ];
    res.status(status).json({ statusCode: status, message, detail: exception.detail });
  }
}
