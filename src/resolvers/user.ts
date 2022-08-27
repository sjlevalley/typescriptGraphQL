import { User } from "../entities/User";
import { MyContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
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
  @Mutation(() => UserResponse)
  async register(
    @Arg("options", () => UsernamePasswordInput) options: UsernamePasswordInput,
    @Ctx() ctx: MyContext
  ): Promise<UserResponse> {
    const userExists = await ctx.em.findOne(User, {
      username: options.username,
    });
    if (userExists) {
      return {
        errors: [{ field: "Username", message: "Username already exists" }],
      };
    }
    if (options.username.trim().length <= 2) {
      return {
        errors: [
          { field: "Username", message: "Length must be greater than 2" },
        ],
      };
    }
    if (options.password.trim().length <= 6) {
      return {
        errors: [
          { field: "Password", message: "Length must be greater than 6" },
        ],
      };
    }
    const hashedPassword = await argon2.hash(options.password);
    const user = ctx.em.create(User, {
      username: options.username,
      password: hashedPassword,
    });
    // Alternatively, to handle duplicate user error, can wrap the persistAndFlush around a try/catch and return the error in the catch statement
    await ctx.em.persistAndFlush(user);
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options", () => UsernamePasswordInput) options: UsernamePasswordInput,
    @Ctx() ctx: MyContext
  ): Promise<UserResponse> {
    const user = await ctx.em.findOne(User, { username: options.username });
    if (!user) {
      return {
        errors: [
          { field: "Login Credentials", message: "Credentials invalid" },
        ],
      };
    }
    const validPassword = await argon2.verify(user.password, options.password);
    if (!validPassword) {
      return {
        errors: [{ field: "password", message: "Credentials invalid" }],
      };
    }
    return { user };
  }
}
