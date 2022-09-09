import { Field, Int, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@ObjectType() // Added for type-graphql
@Entity()
export class User extends BaseEntity {
  @Field(() => Int) // Added for type-graphql, if this decorator is not added, this field cannot be queried
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;

  @Field()
  @Column({ unique: true })
  username!: string;

  @Field()
  @Column({ unique: true })
  email!: string;

  // Field() property not present on this one because we do not want to allow users to access the password property
  @Column()
  password!: string;
}
