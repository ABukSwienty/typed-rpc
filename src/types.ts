/**
 * Get the value of an object at a certain path (using dot notation)
 *
 * @example
 * const myObj = {
 *  foo: {
 *   bar: {
 *     baz: "hi"
 *   }
 *  }
 * } as const;
 *
 * type baz = ValueAtPath<typeof myObj, "foo.bar.baz"> // "hi"
 *
 */
export type ValueAtObjectPath<
  T,
  Path extends string,
> = Path extends `${infer First}.${infer Rest}`
  ? First extends keyof T
    ? ValueAtObjectPath<T[First], Rest>
    : never
  : Path extends keyof T
    ? T[Path]
    : never;
