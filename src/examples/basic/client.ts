import type {
  ProtocolPaths,
  ProtocolResponse,
  Protocols,
  ProtocolParams,
} from "./types";

export const rpcClient = async <Path extends ProtocolPaths<Protocols>>(
  path: Path,
  params: ProtocolParams<Protocols, Path>,
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
