import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { createDbClient } from "~/db/client";
import { todosTable } from "~/db/schema";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const todoId = params.id;
  const db = createDbClient(context);

  if (!todoId) {
    throw new Response("Not Found", { status: 404 });
  }

  const todo = await db
    .select()
    .from(todosTable)
    .where(eq(todosTable.id, Number(todoId)))
    .limit(1);

  if (!todo || todo.length === 0) {
    throw new Response("Todo not found", { status: 404 });
  }

  return { todo: todo[0] };
}

export default function TodoDetail() {
  const { todo } = useLoaderData<typeof loader>();

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
          </div>
        </div>
      </div>
    </div>
  );
}
