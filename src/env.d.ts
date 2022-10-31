declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SESSION_SECRET: string;
      DATABASE_URL: string;
      PORT: string;
      CORS_ORIGIN: string;
    }
  }
}

export {}
