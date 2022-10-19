import { User } from "../entities/User";
import { MyContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
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
import { typormConnection } from "../index";

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

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    // this is the current user and its ok to show them their own email
    if (req.session.userId === user.id) {
      return user.email;
    }
    // current user wants to see someone elses email
    return "";
  }
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.trim().length <= 6) {
      return {
        errors: [
          { field: "newPassword", message: "Length must be greater than 6" },
        ],
      };
    }
    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return {
        errors: [{ field: "token", message: "Token expired" }],
      };
    }

    const user = await User.findOneBy({ id: +userId });
    if (!user) {
      return {
        errors: [{ field: "token", message: "User no longer exists" }],
      };
    }
    await User.update(
      { id: +userId },
      { password: await argon2.hash(newPassword) }
    );
    await redis.del(key);

    // Log in user after password change
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOneBy({ email }); // May need to change this to incorporate a where clause
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
  me(@Ctx() { req }: MyContext) {
    if (!req.session!.userId) {
      // if you are not logged in
      return null;
    }
    return User.findOneBy({ id: req.session!.userId });
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options", () => UsernamePasswordInput) options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    if (errors) {
      return { errors };
    }
    const hashedPassword = await argon2.hash(options.password);
    // Alternatively, to handle duplicate user error, can wrap the persistAndFlush around a try/catch and return the error in the catch statement
    let user;
    try {
      // User.create({
      //   username: options.username,
      //   email: options.email,
      //   password: hashedPassword,
      // }).save()
      // Alternative to this code above:
      const result = await typormConnection
        .createQueryBuilder()
        .insert()
        .into(User)
        .values([
          {
            username: options.username,
            email: options.email,
            password: hashedPassword,
          },
        ])
        .returning("*")
        .execute();
      user = result.raw[0];
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
    req.session!.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const info = validateEmail(usernameOrEmail)
      ? { email: usernameOrEmail }
      : { username: usernameOrEmail };
    const user = await User.findOneBy(info);
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

    req.session.userId = user.id;
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
