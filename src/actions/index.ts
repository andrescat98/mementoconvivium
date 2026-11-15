import { ActionError, defineAction, type ActionAPIContext } from "astro:actions";
import { z } from "astro/zod";
import { env } from "cloudflare:workers";
import { checkPassword, isAdmin, login, logout } from "../lib/auth";
import { deleteEvent, getHistory, getSettingsHistory, putImage, saveEvent, saveSettings, StaleError } from "../lib/db";
import { eventoSchema, settingsSchema, slugSchema } from "../lib/schema";

async function guard(ctx: ActionAPIContext) {
  if (!(await isAdmin(ctx.cookies))) throw new ActionError({ code: "UNAUTHORIZED", message: "Sessione scaduta: ricarica la pagina e rientra." });
}
const invalidate = (ctx: ActionAPIContext) => ctx.cache.invalidate({ tags: ["eventi"] });

const MAX_IMG = 1024 * 1024;
const author = z.string().trim().max(40).optional();

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
      rev: z.number().int().optional(),
      force: z.boolean().optional(),
      author,
      data: eventoSchema,
    }),
    async handler(input, ctx) {
      await guard(ctx);
      let saved;
      try {
        saved = await saveEvent(input);
      } catch (e) {
        if (e instanceof StaleError)
          throw new ActionError({ code: "PRECONDITION_FAILED", message: "Un altro moderatore ha salvato questo evento dopo che l'hai aperto." });
        if (String(e).includes("UNIQUE")) throw new ActionError({ code: "CONFLICT", message: `Esiste già un evento con slug "${input.slug}".` });
        throw e;
      }
      await invalidate(ctx);
      return { slug: input.slug, ...saved };
    },
  }),

  deleteEvent: defineAction({
    input: z.object({ slug: slugSchema, author }),
    async handler({ slug, author }, ctx) {
      await guard(ctx);
      await deleteEvent(slug, author);
      await invalidate(ctx);
    },
  }),

  saveSettings: defineAction({
    input: z.object({ settings: settingsSchema, author }),
    async handler({ settings, author }, ctx) {
      await guard(ctx);
      await saveSettings(settings, author);
      await invalidate(ctx);
    },
  }),

  settingsHistory: defineAction({
    async handler(_, ctx) {
      await guard(ctx);
      return getSettingsHistory();
    },
  }),

  history: defineAction({
    input: z.object({ slug: slugSchema }),
    async handler({ slug }, ctx) {
      await guard(ctx);
      return getHistory(slug);
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
