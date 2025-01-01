import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { drizzle } from "drizzle-orm/d1";

export function createDbClient(context: LoaderFunctionArgs["context"]) {
  return drizzle(context.cloudflare.env.DB);
}
