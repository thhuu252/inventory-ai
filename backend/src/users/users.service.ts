import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { ILike, Repository } from 'typeorm';
import { paginate, PaginationQueryDto } from '../common/dto/pagination.dto';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  async findAll(q: PaginationQueryDto) {
    const where = q.search
      ? [{ email: ILike(`%${q.search}%`) }, { fullName: ILike(`%${q.search}%`) }]
      : {};
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: q.skip,
      take: q.limit,
    });
    return paginate(items, total, q);
  }

  async findOne(id: number) {
    const user = await this.repo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Includes the password hash; only used by the auth flow. */
  findByEmailWithPassword(email: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();
  }

  async create(dto: CreateUserDto) {
    if (await this.repo.exists({ where: { email: ILike(dto.email) } })) {
      throw new ConflictException('Email already in use');
    }
    const user = this.repo.create({
      email: dto.email.toLowerCase(),
      fullName: dto.fullName,
      role: dto.role,
      passwordHash: await bcrypt.hash(dto.password, 10),
    });
    const saved = await this.repo.save(user);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    const { password, ...rest } = dto;
    Object.assign(user, rest);
    if (password) user.passwordHash = await bcrypt.hash(password, 10);
    await this.repo.save(user);
    return this.findOne(id);
  }
}
