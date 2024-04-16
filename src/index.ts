import { Hono } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// account_booksを取得するAPI
app.get("/account_books", async (c) => {
  // account_bookテーブルの全データを取得
  const result = await c.env.DB.prepare("SELECT * FROM account_books").all();
  return c.json(result);
});

const postRequestSchema = z.object({
  date: z
    .string()
    .datetime({ message: "Invalid datetime string! Must be UTC." }),
  item: z
    .string()
    .min(1)
    .max(100, { message: "Item must be between 1 and 100 characters." }),
  amount: z
    .number()
    .nonnegative({ message: "Amount must be a non-negative number." }),
});

// account_bookにデータを追加するAPI
app.post(
  "/account_books",
  validator("json", (value, c) => {
    const parsed = postRequestSchema.safeParse(value);
    if (!parsed.success) {
      return c.text(parsed.error.errors[0].message, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const { date, item, amount } = c.req.valid("json");
    // account_bookテーブルにデータを追加する
    const result = await c.env.DB.prepare(
      "INSERT INTO account_books (date, item, amount) VALUES (?, ?, ?)"
    )
      .bind(date, item, amount)
      .run();

    if (!result.success) {
      console.log(result.error);
      return c.text("Failed to insert data!", 500);
    }

    return c.json(
      {
        message: "Created!",
      },
      201
    );
  }
);

export default app;
