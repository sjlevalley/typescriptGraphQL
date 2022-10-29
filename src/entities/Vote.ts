import { Entity, BaseEntity, ManyToOne, PrimaryColumn, Column } from "typeorm";
import { User } from "./User";
import { Post } from "./Post";
import { ObjectType } from "type-graphql";

// m to n
// many to many
// user <-> posts
// user -> join table <- posts
// user -> vote <- posts

@ObjectType()
@Entity()
export class Vote extends BaseEntity {
  @Column({ type: "int" })
  value: number;

  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => User, (user) => user.votes)
  user: User;

  @PrimaryColumn()
  postId: number;

  @ManyToOne(() => Post, (post) => post.votes, {
    onDelete: "CASCADE",
  })
  post: Post;
}
