import { ActionError, defineAction, type ActionAPIContext } from "astro:actions";
import { z } from "astro/zod";
import { env } from "cloudflare:workers";
import { checkPassword, isAdmin, login, logout } from "../lib/auth";
import { deleteEvent, putImage, saveEvent } from "../lib/db";
import { eventoSchema, slugSchema } from "../lib/schema";

async function guard(ctx: ActionAPIContext) {
  if (!(await isAdmin(ctx.cookies))) throw new ActionError({ code: "UNAUTHORIZED" });
}
const invalidate = (ctx: ActionAPIContext) => ctx.cache.invalidate({ tags: ["eventi"] });

const MAX_IMG = 1024 * 1024;

export const server = {
  login: defineAction({
    accept: "form",
    input: z.object({ password: z.string() }),
    async handler({ password }, ctx) {
      const { success } = await env.LOGIN_LIMIT.limit({ key: ctx.clientAddress });
      if (!success) throw new ActionError({ code: "TOO_MANY_REQUESTS", message: "Troppi tentativi, riprova tra un minuto." });
      if (!(await checkPassword(password))) throw new ActionError({ code: "UNAUTHORIZED", message: "Password errata." });
      await login(ctx.cookies);
    },
  }),

  logout: defineAction({
    accept: "form",
    handler: (_, ctx) => logout(ctx.cookies),
  }),

  saveEvent: defineAction({
    input: z.object({
      slug: slugSchema,
      originalSlug: slugSchema.optional(),
      data: eventoSchema,
      body: z.string(),
    }),
    async handler({ slug, originalSlug, data, body }, ctx) {
      await guard(ctx);
      try {
        await saveEvent(slug, data, body, originalSlug);
      } catch (e) {
        if (String(e).includes("UNIQUE")) throw new ActionError({ code: "CONFLICT", message: `Esiste già un evento "${slug}".` });
        throw e;
      }
      await invalidate(ctx);
      return { slug };
    },
  }),

  deleteEvent: defineAction({
    input: z.object({ slug: slugSchema }),
    async handler({ slug }, ctx) {
      await guard(ctx);
      await deleteEvent(slug);
      await invalidate(ctx);
    },
  }),

  uploadImage: defineAction({
    accept: "form",
    input: z.object({ file: z.instanceof(File) }),
    async handler({ file }, ctx) {
      await guard(ctx);
      if (!/^image\/(webp|jpeg|png)$/.test(file.type)) throw new ActionError({ code: "BAD_REQUEST", message: "Formato non supportato." });
      if (file.size > MAX_IMG) throw new ActionError({ code: "BAD_REQUEST", message: "Immagine oltre 1 MB." });
      return { url: await putImage(await file.arrayBuffer(), file.type) };
    },
  }),
};
