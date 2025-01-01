/* eslint-disable no-case-declarations */
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { useState } from "react";
import { todosTable } from "~/db/schema";
import { clsx, type ClassArray } from "clsx";

function cx(...classes: ClassArray) {
  return clsx(classes);
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

  return { todos: result };
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const db = drizzle(context.cloudflare.env.DB);

  const formData = await request.formData();
  const action = formData.get("action");
  const title = formData.get("title");
  const id = formData.get("id");

  switch (action) {
    case "delete":
      if (!id) {
        throw new Error("No id provided");
      }

      await db.delete(todosTable).where(eq(todosTable.id, Number(id)));
      break;
    case "add":
      await db.insert(todosTable).values({ title: title as string });
      break;
    case "update":
      if (!id) {
        throw new Error("No id provided");
      }

      await db
        .update(todosTable)
        .set({ title: title as string })
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
    <ul>
      <li>
        <Form method="post">
          <input type="text" name="title" />
          <input type="hidden" name="action" value="add" />
          <button>Add</button>
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
  const fetcher = useFetcher();
  return (
    <li>
      {isEditing ? null : (
        <span
          className={cx(
            "text-2xl",
            todo.completed ? "text-gray-100 line-through" : "text-gray-200"
          )}
        >
          {todo.title}
        </span>
      )}

      {isEditing ? (
        <fetcher.Form method="post">
          <input type="hidden" name="id" value={todo.id} />
          <input
            disabled={fetcher.state === "submitting"}
            type="text"
            name="title"
            defaultValue={todo.title}
          />
          <input type="hidden" name="action" value="update" />
          <button>Save</button>
        </fetcher.Form>
      ) : (
        <button onClick={() => setIsEditing(true)}>Edit</button>
      )}
      <Form method="post">
        <input type="hidden" name="id" value={todo.id} />
        <input type="hidden" name="action" value="delete" />
        <button>Delete</button>
      </Form>
    </li>
  );
}
