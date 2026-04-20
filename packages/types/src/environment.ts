const NODE_ENV = process.env.NODE_ENV ?? "production";

export const IS_DEVELOPMENT = NODE_ENV === "development";
