import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums';
import { RolesGuard } from './roles.guard';

const ctx = (role?: Role) =>
  ({
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { id: 1, role } : undefined }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  it('allows routes without @Roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(ctx(Role.STAFF))).toBe(true);
  });

  it.each([
    [Role.STAFF, false],
    [Role.MANAGER, true],
    [Role.ADMIN, true],
  ])('MANAGER route, user %s -> %s', (role, expected) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
    expect(guard.canActivate(ctx(role))).toBe(expected);
  });

  it('denies when no user is attached', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
    expect(guard.canActivate(ctx())).toBe(false);
  });
});
