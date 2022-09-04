"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORGET_PASSWORD_VALID_DURATION = exports.FORGET_PASSWORD_PREFIX = exports.COOKIE_NAME = exports.__prod__ = void 0;
exports.__prod__ = process.env.NODE_ENV === "production";
exports.COOKIE_NAME = "qid";
exports.FORGET_PASSWORD_PREFIX = "forget-password:";
exports.FORGET_PASSWORD_VALID_DURATION = 1000 * 60 * 60 * 24;
//# sourceMappingURL=constants.js.map