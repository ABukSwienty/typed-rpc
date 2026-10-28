import type { z } from "zod";
import type { ValueAtObjectPath } from "@/types";
import type { protocols } from "./server";
import type { RPCProcedure } from "./rpc";

export type Protocols = typeof protocols;

/**
 * Dotted paths of every procedure: "user.findOne" | "post.findOne" | ...
 */
type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends RPCProcedure
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
 * Get the parameters of a protocol (the schema's input, before parsing), or
 * `undefined` for a procedure without a schema
 */
export type ProtocolParams<Protocols, Path extends ProtocolPaths<Protocols>> =
  FlatProtocols<Protocols>[Path] extends RPCProcedure<infer Schema>
    ? Schema extends z.core.$ZodType
      ? z.input<Schema>
      : undefined
    : never;

/**
 * Client arguments after the path; params can be omitted when they accept
 * `undefined`, like calling `.query()` on a tRPC procedure without input
 */
export type ProtocolArgs<Protocols, Path extends ProtocolPaths<Protocols>> =
  undefined extends ProtocolParams<Protocols, Path>
    ? [params?: ProtocolParams<Protocols, Path>]
    : [params: ProtocolParams<Protocols, Path>];

/**
 * Get the return type of a protocol
 */
export type ProtocolResponse<Protocols, Path extends ProtocolPaths<Protocols>> =
  FlatProtocols<Protocols>[Path] extends RPCProcedure<any, infer Output>
    ? Awaited<Output>
    : never;
