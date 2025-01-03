import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { createDbClient, createKvClient } from "~/db/client";
import { todosTable } from "~/db/schema";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const todoId = params.id;

  const kv = createKvClient(context);

  if (!todoId) {
    throw new Response("Not Found", { status: 404 });
  }

  const todoString = await kv.get(todoId);

  if (todoString) {
    const todo = JSON.parse(todoString);
    console.info("CACHE HIT", todoId);

    return { todo };
  }

  console.info("CACHE MISS", todoId);

  const db = createDbClient(context);

  const todo = await db
    .select()
    .from(todosTable)
    .where(eq(todosTable.id, Number(todoId)))
    .limit(1);

  if (!todo || todo.length === 0) {
    throw new Response("Todo not found", { status: 404 });
  }

  await kv.put(todoId, JSON.stringify(todo[0]));

  return { todo: todo[0] };
}

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const title = formData.get("title");
  const description = formData.get("description");

  const ai = context.cloudflare.env.AI;
  const kv = createKvClient(context);

  const prompt = `Summerize this todo: ${title} ${description}`;

  const cacheResult = await kv.get(prompt);

  if (cacheResult) {
    return { summary: cacheResult };
  }

  const result = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
    prompt,
  });

  // @ts-expect-error types
  const response = result.response;

  console.log(result, response);

  await kv.put(prompt, response);

  return { summary: response };
};

export default function TodoDetail() {
  const { todo } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const data = fetcher.data;

  const imageUrl = todo.imageKey ? `/api/images/${todo.imageKey}` : null;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-white">{todo.title}</h1>

        {imageUrl && (
          <div className="mb-4">
            <img
              src={imageUrl}
              alt={todo.title}
              className="rounded-lg w-full max-h-[400px] object-cover"
            />
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Description</h2>
            <p className="text-gray-400">
              {todo.description || "No description provided"}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">Status</h2>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm ${
                todo.completed
                  ? "bg-green-500 text-white"
                  : "bg-yellow-500 text-white"
              }`}
            >
              {todo.completed ? "Completed" : "Pending"}
            </span>
            <fetcher.Form method="post">
              <input
                type="hidden"
                name="title"
                value={todo.title}
                defaultValue={todo.title}
              />
              <input
                type="hidden"
                name="description"
                value={todo.description}
                defaultValue={todo.description}
              />
              <button type="submit">Summarize</button>
            </fetcher.Form>
            {fetcher.state === "submitting" && <p>Summarizing...</p>}
            {data && <p>{data.summary}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
