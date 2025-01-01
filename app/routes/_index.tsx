import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { Form, useLoaderData } from "@remix-run/react";
import { drizzle } from "drizzle-orm/d1";
import { todosTable } from "~/db/schema";

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
  const title = formData.get("title");

  await db.insert(todosTable).values({ title: title as string });

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
          <button>Add</button>
        </Form>
      </li>
      {todos.map((todo) => (
        <li className="list-disc" key={todo.id}>
          {todo.title}
        </li>
      ))}
    </ul>
  );
}
