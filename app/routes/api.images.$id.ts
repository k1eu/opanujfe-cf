import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { createFileStorage } from "./_index";

export async function loader({ params, context }: LoaderFunctionArgs) {
  console.log({ params });
  const file = await createFileStorage(context).get(params.id!);

  return new Response(file, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
    },
  });
}
