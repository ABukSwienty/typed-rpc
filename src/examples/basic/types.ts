import type { ValueAtObjectPath } from "@/types";
import type { protocols } from "./server";

export type Protocols = typeof protocols;

type GenericFunction = (...args: any[]) => any;

/**
 * Dotted paths of every procedure: "user.findOne" | "post.findOne" | ...
 */
type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends GenericFunction
    ? `${Prefix}${K}`
    : T[K] extends object
      ? Paths<T[K], `${Prefix}${K}.`>
      : never;
}[keyof T & string];

/**
 * Protocol tree flattened into one object type keyed by dotted path
 */
export type FlatProtocols<Protocols> = {
  [Path in Paths<Protocols>]: ValueAtObjectPath<Protocols, Path>;
};

/**
 * Get all the paths of protocol
 */
export type ProtocolPaths<Protocols> = keyof FlatProtocols<Protocols> & string;

/**
 * Get the parameters of a protocol
 */
export type ProtocolParams<
  Protocols,
  Path extends ProtocolPaths<Protocols>,
> = FlatProtocols<Protocols>[Path] extends (...args: infer Args) => any
  ? Args
  : never;

/**
 * Get the return type of a protocol
 */
export type ProtocolResponse<
  Protocols,
  Path extends ProtocolPaths<Protocols>,
> = FlatProtocols<Protocols>[Path] extends (...args: any[]) => infer Result
  ? Awaited<Result>
  : never;
