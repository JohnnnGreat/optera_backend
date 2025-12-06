import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Column('varchar', { length: 500 })
  token: string;

  @Column('timestamp with time zone')
  expiresAt: Date;

  @Column('boolean', { default: false })
  isRevoked: boolean;

  @Column('varchar', { length: 255, nullable: true })
  userAgent?: string;

  @Column('varchar', { length: 45, nullable: true })
  ipAddress?: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;
}
