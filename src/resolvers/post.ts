import { isAuth } from "../middleware/isAuth";
import { MyContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Info,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { Post } from "../entities/Post";
import { typormConnection } from "../index";
import { Updoot } from "../entities/Updoot";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field()
  hasMore: boolean;
}

// Note, need to set the typescript type AND the graphql type when using type-graphql
@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  // This field resolver is used to perform the slice operation every time the Resolver receives a 'Post' object in a response,
  // the user can receive the textSnippet in the graphQL query instead of the whole text
  textSnippet(@Root() root: Post) {
    if (root.text.length > 50) {
      return `${root.text.slice(0, 50)}...`;
    } else {
      return root.text;
    }
  }

  @Mutation(() => Boolean)
  // @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    const isUpdoot = value !== -1;
    const realValue = isUpdoot ? 1 : -1;
    const { userId } = req.session;
    const updoot = await Updoot.findOne({ where: { postId, userId } });

    if (updoot && updoot.value !== realValue) {
      // user has voted on this post already & they are changing their vote
      await typormConnection.transaction(async (tm) => {
        await tm.query(
          `
        UPDATE updoot 
        set value = $1
        where "postId" = $2 and "userId" = $3
      `,
          [realValue, postId, userId]
        );
        await tm.query(
          `
          update post
          set points = points + $1
          where id = $2;
      `,
          [2 * realValue, postId]
        );
      });
    } else if (!updoot) {
      // user hasn't voted on this post yet
      await typormConnection.transaction(async (tm) => {
        await tm.query(
          `
          INSERT INTO updoot ("userId", "postId", value)
          values ($1, $2, $3);
        `,
          [userId, postId, realValue]
        );
        await tm.query(
          `
          update post
          set points = points + $1
          where id = $2;
        `,
          [realValue, postId]
        );
      });
    }
    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    @Ctx() { req }: MyContext
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(10, limit);
    const realLimitPlusOne = realLimit + 1;

    console.log(
      "USER ID USER ID USER ID ***************************************",
      req.session.userId
    );

    const replacements: any[] = [realLimitPlusOne];

    if (req.session.userId) {
      replacements.push(req.session.userId);
    }

    let cursorIdx = 3;
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
      cursorIdx = replacements.length;
    }
    const posts = await typormConnection.query(
      `
    select p.*,
    json_build_object(
      'id', u.id,
      'username', u.username,
      'email', u.email,
      'createdAt', u."createdAt",
      'updatedAt', u."updatedAt"
      ) creator 
    ${
      req.session.userId
        ? `, (select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"`
        : ', null as "voteStatus"'
    }
    from post p
    inner join public.user u on u.id = p."creatorId"
    ${cursor ? `where p."createdAt" < $${cursorIdx}` : ""}
    order by p."createdAt" DESC
    limit $1
    `,
      replacements
    );
    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
  }

  @Query(() => Post, { nullable: true })
  async post(@Arg("id", () => Int) id: number): Promise<Post | null> {
    const post = await Post.find({
      where: { id },
      relations: ["creator"],
    });
    if (!post[0]) {
      return null;
    }
    return post[0];
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    return Post.create({ ...input, creatorId: req.session.userId }).save(); // this is 2 SQL queries
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title", () => String, { nullable: true }) title: string
  ): Promise<Post | null> {
    const post = await Post.findOneBy({ id });
    if (!post) {
      return null;
    }
    if (typeof title !== "undefined") {
      await Post.update({ id }, { title });
    }
    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg("id") id: number): Promise<boolean> {
    await Post.delete(id);
    return true;
  }
}
