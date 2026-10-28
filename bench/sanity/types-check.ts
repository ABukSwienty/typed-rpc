// Type-level checks for src/examples/basic/types.ts against a generated router.
// Requires `npm run bench:gen` (any set of sizes that includes 10).
import { rpcClient } from "../generated/n10/basic/client";

export const run = async () => {
  const ok = await rpcClient("router0.proc3", [{ id: "1", field3: 3 }]);
  const exact: { id: string; value3: string } = ok;
  ok.value3;
  // @ts-expect-error unknown path
  await rpcClient("router0.nope", [{ id: "1" }]);
  // @ts-expect-error router is not a procedure
  await rpcClient("router0", [{ id: "1" }]);
  // @ts-expect-error wrong params for path
  await rpcClient("router0.proc3", [{ id: "1", field4: 4 }]);
  // @ts-expect-error field from another procedure's result
  ok.value4;
};
