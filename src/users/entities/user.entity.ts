import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { Role } from '../../common/decorators/roles.decorator';

@Entity('users')
@Index(['email', 'tenantId'], { unique: true })
export class User extends BaseEntity {
  @Column('varchar', { length: 100 })
  firstName: string;

  @Column('varchar', { length: 100 })
  lastName: string;

  @Column('varchar', { length: 255 })
  email: string;

  @Column('varchar', { length: 255, select: false })
  password: string;

  @Column('simple-array', { default: Role.MEMBER })
  roles: Role[];

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('timestamp with time zone', { nullable: true })
  lastLoginAt?: Date;

  @Column('varchar', { length: 255, nullable: true })
  avatar?: string;

  @Column('varchar', { length: 20, nullable: true })
  phone?: string;

  @Column('text', { nullable: true })
  bio?: string;

  @Column('varchar', { length: 255, nullable: true, select: false })
  resetToken?: string;

  @Column('timestamp with time zone', { nullable: true, select: false })
  resetTokenExpiry?: Date;

  @Column('boolean', { default: false })
  emailVerified: boolean;

  @Column('varchar', { length: 255, nullable: true, select: false })
  emailVerificationToken?: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.users, { nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant?: Tenant;

  @Column('uuid', { nullable: true })
  tenantId?: string;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
