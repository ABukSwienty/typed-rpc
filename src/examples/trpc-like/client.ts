import type {
  ProtocolArgs,
  ProtocolPaths,
  ProtocolResponse,
  Protocols,
} from "./types";

export const rpcClient = async <Path extends ProtocolPaths<Protocols>>(
  path: Path,
  ...[params]: ProtocolArgs<Protocols, Path>
) => {
  const response = await fetch("api/rpc", {
    method: "POST",
    body: JSON.stringify({
      path,
      params,
    }),
  });

  const result = await response.json();

  return result as ProtocolResponse<Protocols, Path>;
};
