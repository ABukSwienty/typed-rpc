import { z } from "zod";

// z.core.$ZodType is zod's minimal base type. Checking schemas against it is far
// cheaper for the type checker than the full z.ZodType class.
type Schema = z.core.$ZodType;

/**
 * What the handler receives: the parsed schema output, or nothing without a schema
 */
type HandlerInput<S extends Schema | null> = S extends Schema
  ? z.output<S>
  : undefined;

/**
 * The handler only ever receives parsed schema output, so it can never be
 * called with unvalidated input.
 */
export class RPCProcedure<S extends Schema | null = any, Output = any> {
  constructor(
    public schema: S,
    public handler: (input: HandlerInput<S>) => Output,
  ) {}

  public run(args: unknown) {
    // Like a tRPC procedure without .input(), raw input is ignored without a schema
    const input = this.schema ? z.parse(this.schema, args) : undefined;
    return this.handler(input as HandlerInput<S>);
  }
}

export const procedure = {
  /**
   * Procedure whose handler input is inferred from the schema
   */
  input: <S extends Schema>(schema: S) => ({
    handler: <Output>(handler: (input: HandlerInput<S>) => Output) =>
      new RPCProcedure(schema, handler),
  }),

  /**
   * Procedure without input
   */
  handler: <Output>(handler: () => Output) => new RPCProcedure(null, handler),
};
