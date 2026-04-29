export {};

declare global {
  interface D1PreparedStatementLike {
    bind(...values: Array<string | number | null>): D1PreparedStatementLike;
    first<T = unknown>(columnName?: string): Promise<T | null>;
    run<T = unknown>(): Promise<T>;
    all<T = unknown>(): Promise<{ results: T[] }>;
  }

  interface D1DatabaseLike {
    prepare(query: string): D1PreparedStatementLike;
    batch<T = unknown>(statements: D1PreparedStatementLike[]): Promise<T[]>;
  }

  interface R2ObjectLike {
    key: string;
    size: number;
  }

  interface R2BucketLike {
    head(key: string): Promise<R2ObjectLike | null>;
  }

  interface CloudflareEnv {
    ACCESS_AUD?: string;
    ACCESS_TEAM_DOMAIN?: string;
    ADMIN_EMAILS?: string;
    ALLOW_LOCAL_ADMIN?: string;
    RESEND_API_KEY?: string;
    RESEND_FROM_EMAIL?: string;
    DB: D1DatabaseLike;
    MOTBA_BUCKET: R2BucketLike;
    NEXTJS_ENV?: string;
  }
}
