import { User } from "../entities/User";
import { MyContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import argon2 from "argon2";

// Alternate to using the @Arg, create a class of InputType
// @InputTypes are used for arguments for mutations/queries (as opposed to @ObjectTypes, which are returned)
@InputType({ description: "Username & Password" })
class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

// Object types are returned from mutations/queries (as opposed to @InputTypes, which are used for arguments)
@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { em, req }: MyContext) {
    console.log(req.session!);
    // if you are not logged in
    if (!req.session!.userId) {
      return null;
    }
    const user = await em.findOne(User, { id: req.session!.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options", () => UsernamePasswordInput) options: UsernamePasswordInput,
    @Ctx() ctx: MyContext
  ): Promise<UserResponse> {
    if (options.username.trim().length <= 2) {
      return {
        errors: [
          { field: "username", message: "Length must be greater than 2" },
        ],
      };
    }
    if (options.password.trim().length <= 6) {
      return {
        errors: [
          { field: "password", message: "Length must be greater than 6" },
        ],
      };
    }
    const hashedPassword = await argon2.hash(options.password);
    const user = await ctx.em.create(User, {
      username: options.username,
      password: hashedPassword,
    });
    // Alternatively, to handle duplicate user error, can wrap the persistAndFlush around a try/catch and return the error in the catch statement
    try {
      await ctx.em.persistAndFlush(user);
    } catch (e) {
      console.error(e);
      if (e.code === "23505") {
        return {
          errors: [
            {
              field: "username",
              message: "Username already exists",
            },
          ],
        };
      }
    }

    // Stores the user ID on the cookie and keeps them logged in upon registering
    ctx.req.session!.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options", () => UsernamePasswordInput) options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { username: options.username });
    if (!user) {
      return {
        errors: [{ field: "username", message: "Credentials invalid" }],
      };
    }
    const validPassword = await argon2.verify(user.password, options.password);
    if (!validPassword) {
      return {
        errors: [{ field: "password", message: "Credentials invalid" }],
      };
    }

    req.session!.userId = user.id;
    return { user };
  }
}
