/* eslint-disable no-case-declarations */
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { Form, useFetcher, useLoaderData, Link } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useState } from "react";
import { todosTable } from "~/db/schema";
import { clsx, type ClassArray } from "clsx";
import { parseFormData } from "@mjackson/form-data-parser";
import { R2FileStorage } from "@edgefirst-dev/r2-file-storage";

function cx(...classes: ClassArray) {
  return clsx(classes);
}

export function createFileStorage(
  context: LoaderFunctionArgs["context"] | ActionFunctionArgs["context"]
) {
  // @ts-expect-error types
  return new R2FileStorage(context.cloudflare.env.IMAGES);
}

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader = async ({ context }: LoaderFunctionArgs) => {
  const db = drizzle(context.cloudflare.env.DB);

  const result = await db.select().from(todosTable);

  console.log(result);

  return { todos: result };
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const db = drizzle(context.cloudflare.env.DB);

  let imageKey = null;

  const formData = await parseFormData(request, async (file) => {
    if (file.fieldName === "image") {
      const key = `${Date.now()}-${file.name}`;
      await createFileStorage(context).set(key, file);
      imageKey = key;
      return key;
    }
  });

  const action = formData.get("action");
  const title = formData.get("title");
  const description = formData.get("description");
  const id = formData.get("id");

  switch (action) {
    case "delete":
      if (!id) {
        throw new Error("No id provided");
      }

      await db.delete(todosTable).where(eq(todosTable.id, Number(id)));
      break;
    case "add":
      await db.insert(todosTable).values({
        title: title as string,
        description: description as string,
        imageKey,
      });
      break;
    case "update":
      if (!id) {
        throw new Error("No id provided");
      }

      await db
        .update(todosTable)
        .set({
          title: title as string,
          description: description as string,
          imageKey,
        })
        .where(eq(todosTable.id, Number(id)));
      break;
    default:
      throw new Error("Invalid action");
  }

  return true;
};

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="flex h-screen justify-center">
      <div className="flex flex-col items-center gap-16">
        <header className="flex flex-col items-center gap-9">
          <div className="h-[144px] w-[434px]">
            <img
              src="/logo-light.png"
              alt="Remix"
              className="block w-full dark:hidden"
            />
            <img
              src="/logo-dark.png"
              alt="Remix"
              className="hidden w-full dark:block"
            />
            <h2 className="block text-center text-6xl">Todos</h2>
          </div>
        </header>
        <TodoList todos={data.todos} />
      </div>
    </div>
  );
}

function TodoList({ todos }: { todos: (typeof todosTable.$inferSelect)[] }) {
  return (
    <ul className="max-w-2xl mx-auto space-y-4 p-4">
      <li className="bg-gray-800 rounded-lg p-4 shadow-lg">
        <Form method="post" encType="multipart/form-data" className="space-y-3">
          <div>
            <input
              type="text"
              name="title"
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What needs to be done?"
            />
          </div>
          <div>
            <textarea
              name="description"
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add description (optional)"
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="file"
              name="image"
              className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
            />
            <input type="hidden" name="action" value="add" />
            <button className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors">
              Add Task
            </button>
          </div>
        </Form>
      </li>
      {todos.map((todo) => (
        <TodoItem key={`todo-${todo.id}-${todo.title}`} todo={todo} />
      ))}
    </ul>
  );
}

export function TodoItem({ todo }: { todo: typeof todosTable.$inferSelect }) {
  const [isEditing, setIsEditing] = useState(false);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const fetcher = useFetcher();

  const fileUrl = pickedFile
    ? URL.createObjectURL(pickedFile)
    : `/api/images/${todo.imageKey}`;

  return (
    <li className="bg-gray-800 rounded-lg p-4 shadow-lg">
      <div className="flex gap-4">
        {isEditing ? (
          <fetcher.Form
            method="post"
            encType="multipart/form-data"
            className="space-y-3 w-full"
          >
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <label className="cursor-pointer group relative w-16 h-16 block">
                  <img
                    className="w-16 h-16 rounded-lg object-cover group-hover:opacity-50 transition-opacity"
                    src={fileUrl}
                    alt={todo.title}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm">Change</span>
                  </div>
                  <input
                    type="file"
                    name="image"
                    className="hidden"
                    onChange={(e) => setPickedFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div className="flex-1 space-y-2">
                <input type="hidden" name="id" value={todo.id} />
                <div>
                  <input
                    disabled={fetcher.state === "submitting"}
                    type="text"
                    name="title"
                    defaultValue={todo.title}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <textarea
                    disabled={fetcher.state === "submitting"}
                    name="description"
                    defaultValue={todo.description || ""}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setPickedFile(null);
                    }}
                    className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                    Save
                  </button>
                </div>
                <input type="hidden" name="action" value="update" />
              </div>
            </div>
          </fetcher.Form>
        ) : (
          <>
            <img
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              src={`/api/images/${todo.imageKey}`}
              alt={todo.title}
            />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Link
                  to={`/todos/${todo.id}`}
                  className={cx(
                    "text-xl hover:text-blue-400 transition-colors",
                    todo.completed ? "text-gray-400 line-through" : "text-white"
                  )}
                >
                  {todo.title}
                </Link>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Edit
                  </button>
                  <Form method="post" className="inline">
                    <input type="hidden" name="id" value={todo.id} />
                    <input type="hidden" name="action" value="delete" />
                    <button className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                      Delete
                    </button>
                  </Form>
                </div>
              </div>
              {todo.description && (
                <p className="text-gray-400 text-sm mt-1">{todo.description}</p>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  );
}
