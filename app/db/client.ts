import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { drizzle } from "drizzle-orm/d1";

export function createDbClient(context: LoaderFunctionArgs["context"]) {
  return drizzle(context.cloudflare.env.DB);
}

export function createKvClient(context: LoaderFunctionArgs["context"]) {
  return context.cloudflare.env.kv;
}
