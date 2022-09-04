import { Field, InputType } from "type-graphql";

// Alternate to using the @Arg, create a class of InputType
// @InputTypes are used for arguments for mutations/queries (as opposed to @ObjectTypes, which are returned)

@InputType({ description: "Username & Password" })
export class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
  @Field()
  email: string;
}
