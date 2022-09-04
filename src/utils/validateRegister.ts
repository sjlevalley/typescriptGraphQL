import { UsernamePasswordInput } from "../resolvers/UsernamePasswordInput";
import { validateEmail } from "./validateEmail";

export const validateRegister = (options: UsernamePasswordInput) => {
  if (options.username.trim().length <= 2) {
    return [{ field: "username", message: "Length must be greater than 2" }];
  }
  if (options.username.includes("@")) {
    return [
      {
        field: "username",
        message: "Username field must not include '@' symbol",
      },
    ];
  }
  if (!validateEmail(options.email)) {
    return [{ field: "email", message: "Please enter a valid email" }];
  }
  if (options.password.trim().length <= 6) {
    return [{ field: "password", message: "Length must be greater than 6" }];
  }
  return null;
};
