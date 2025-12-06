import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, ILike } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';

import { User } from '../entities/user.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
} from '../dto/user.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/dto/pagination.dto';
import { Role } from '../../common/decorators/roles.decorator';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: createUserDto.email, tenantId: createUserDto.tenantId },
        { email: createUserDto.email, tenantId: '' },
      ],
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      roles: createUserDto.roles || [Role.MEMBER],
    });

    return this.userRepository.save(user);
  }

  async findAll(
    paginationDto: PaginationDto,
    tenantId?: string,
  ): Promise<PaginatedResult<User>> {
    const { page, limit, search, sortBy, sortOrder } = paginationDto;
    const skip = ((page as number) - 1) * limit!;

    const where: FindOptionsWhere<User> = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (search) {
      where.firstName = ILike(`%${search}%`);
      // TODO: Add OR condition for lastName and email
    }

    const [users, total] = await this.userRepository.findAndCount({
      where,
      take: limit,
      skip,
      order: sortBy
        ? { [sortBy]: sortOrder }
        : { createdAt: sortOrder || 'DESC' },
    });

    return {
      data: users,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit!),
        limit,
      } as any,
    };
  }

  async findOne(id: string, tenantId?: string): Promise<User> {
    const where: FindOptionsWhere<User> = { id };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    const user = await this.userRepository.findOne({
      where,
      relations: ['tenant'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string, tenantId?: string): Promise<User> {
    const where: FindOptionsWhere<User> = { email };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    const user = await this.userRepository.findOne({
      where,
      select: [
        'id',
        'email',
        'password',
        'firstName',
        'lastName',
        'roles',
        'isActive',
        'tenantId',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: any,
  ): Promise<User> {
    const user = await this.findOne(id, currentUser.tenantId);

    // Users can only update themselves unless they are admin
    if (user.id !== currentUser.id && !currentUser.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Only admins can change roles and active status
    if (
      (updateUserDto.roles || updateUserDto.isActive !== undefined) &&
      !currentUser.roles.includes(Role.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only admins can change roles or active status',
      );
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email, tenantId: currentUser.tenantId },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
    currentUser: any,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Users can only change their own password unless they are admin
    if (user.id !== currentUser.id && !currentUser.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('You can only change your own password');
    }

    // Verify current password (unless admin is changing someone else's password)
    if (user.id === currentUser.id) {
      const isCurrentPasswordValid = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.password,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      saltRounds,
    );

    await this.userRepository.update(id, { password: hashedPassword });
  }

  async remove(id: string, currentUser: any): Promise<void> {
    if (!currentUser.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('Only admins can delete users');
    }

    const user = await this.findOne(id, currentUser.tenantId);

    if (user.id === currentUser.id) {
      throw new BadRequestException('You cannot delete your own account');
    }

    await this.userRepository.softDelete(id);
  }

  async deactivate(id: string, currentUser: any): Promise<User> {
    if (!currentUser.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('Only admins can deactivate users');
    }

    const user = await this.findOne(id, currentUser.tenantId);

    if (user.id === currentUser.id) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    user.isActive = false;
    return this.userRepository.save(user);
  }

  async activate(id: string, currentUser: any): Promise<User> {
    if (!currentUser.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('Only admins can activate users');
    }

    const user = await this.findOne(id, currentUser.tenantId);
    user.isActive = true;
    return this.userRepository.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  async verifyEmail(id: string): Promise<void> {
    await this.userRepository.update(id, {
      emailVerified: true,
      emailVerificationToken: '',
    });
  }
}
