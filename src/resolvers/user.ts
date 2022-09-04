import { User } from "../entities/User";
import { MyContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import argon2 from "argon2";
import {
  COOKIE_NAME,
  FORGET_PASSWORD_PREFIX,
  FORGET_PASSWORD_VALID_DURATION,
} from "../constants";
import { validateEmail } from "../utils/validateEmail";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";
import { sendEmail } from "../utils/sendEmail";
import { v4 as uuidV4 } from "uuid";

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
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { em, redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.trim().length <= 6) {
      return {
        errors: [
          { field: "newPassword", message: "Length must be greater than 6" },
        ],
      };
    }

    const userId = await redis.get(FORGET_PASSWORD_PREFIX + token);
    if (!userId) {
      return {
        errors: [{ field: "token", message: "Token Expired" }],
      };
    }
    console.log(userId);

    const user = await em.findOne(User, { id: +userId });
    if (!user) {
      return {
        errors: [{ field: "token", message: "User no longer exists" }],
      };
    }
    user.password = await argon2.hash(newPassword);
    await em.persistAndFlush(user);

    // Log in user after password change
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { em, redis }: MyContext
  ) {
    const user = await em.findOne(User, { email });
    if (!user) {
      // email not in db
      return true; // returning true prevents people from fishing and trying to find users' emails
    }
    const token = uuidV4();
    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      "EX",
      FORGET_PASSWORD_VALID_DURATION
    );
    const resetPasswordLink = `<a href="http://localhost:3000/change-password/${token}">Click here to reset password</a>`;
    await sendEmail(email, resetPasswordLink);
    return true;
  }

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
    const errors = validateRegister(options);
    if (errors) {
      return { errors };
    }
    const hashedPassword = await argon2.hash(options.password);
    const user = await ctx.em.create(User, {
      username: options.username,
      email: options.email,
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
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(
      User,
      validateEmail(usernameOrEmail)
        ? { email: usernameOrEmail }
        : { username: usernameOrEmail }
    );
    if (!user) {
      return {
        errors: [{ field: "usernameOrEmail", message: "Invalid credentials" }],
      };
    }
    const validPassword = await argon2.verify(user.password, password);
    if (!validPassword) {
      return {
        errors: [{ field: "password", message: "Invalid credentials" }],
      };
    }

    req.session!.userId = user.id;
    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((e) => {
        res.clearCookie(COOKIE_NAME);
        if (e) {
          console.error(e);
          resolve(false);
          return;
        }
        resolve(true);
      })
    );
  }
}
