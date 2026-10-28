import { z } from "zod";
import { procedure } from "./rpc";

export const protocols = {
  user: {
    findOne: procedure
      .input(z.object({ id: z.string() }))
      .handler(async (params) => ({
        id: "id-123",
        name: "foo",
        email: "bar",
      })),
  },
  post: {
    findOne: procedure
      .input(z.object({ slug: z.string() }))
      .handler(async (params) => ({
        content: "foo bar",
      })),
  },
};
