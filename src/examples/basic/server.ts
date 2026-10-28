export const protocols = {
  user: {
    findOne: async (params: { id: string }) => ({
      id: "id-123",
      name: "foo",
      email: "bar",
    }),
  },
  post: {
    findOne: async (params: { slug: string }) => ({
      content: "foo bar",
    }),
  },
};
