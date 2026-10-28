## Type-checking benchmark

How much type-level work four ways of defining the same RPC API cost the
TypeScript compiler, from 1 to 500 procedures.

| Variant       | What it is                                                          | Validates input |
| ------------- | ------------------------------------------------------------------- | --------------- |
| **basic**     | Plain object of async functions (`src/examples/basic`)              | No              |
| **trpc-like** | `procedure.input(zodSchema).handler(fn)` (`src/examples/trpc-like`) | zod             |
| **trpc**      | tRPC 11 with a type-asserting input parser                          | No              |
| **trpc-zod**  | tRPC 11 with zod input schemas                                      | zod             |

### Summary

- **basic** is the cheapest at every size: about 2.4× fewer instantiations
  than trpc and 6.6× fewer than trpc-zod at 500 procedures.
- **trpc-like** beats **trpc-zod**, its fair comparison, at every size: about
  28% fewer instantiations and 10% less memory at 500 procedures.
- All four grow roughly linearly. tRPC carries a fixed cost of about 10,000
  instantiations before the first procedure.

### Results

Instantiations and types are exact and identical on every run. Types and
memory include an empty file's baseline of 340 types and 25.8 MB.

#### 1 procedure

| Variant   | Instantiations | Types | Memory (MB) |
| --------- | -------------: | ----: | ----------: |
| basic     |      **4,381** | 2,083 |        26.7 |
| trpc-like |         15,282 | 8,078 |        38.5 |
| trpc      |         14,378 | 8,226 |        33.3 |
| trpc-zod  |         16,980 | 9,911 |        41.8 |

#### 10 procedures

| Variant   | Instantiations |  Types | Memory (MB) |
| --------- | -------------: | -----: | ----------: |
| basic     |      **7,020** |  2,790 |        27.9 |
| trpc-like |         28,091 | 10,607 |        40.8 |
| trpc      |         20,678 |  9,576 |        34.4 |
| trpc-zod  |         34,755 | 12,908 |        44.6 |

#### 50 procedures

| Variant   | Instantiations |  Types | Memory (MB) |
| --------- | -------------: | -----: | ----------: |
| basic     |     **18,948** |  5,996 |        32.9 |
| trpc-like |         85,219 | 21,933 |        51.4 |
| trpc      |         49,150 | 15,755 |        39.7 |
| trpc-zod  |        114,227 | 26,407 |        56.0 |

#### 100 procedures

| Variant   | Instantiations |  Types | Memory (MB) |
| --------- | -------------: | -----: | ----------: |
| basic     |     **33,858** |  9,986 |        38.7 |
| trpc-like |        156,629 | 36,073 |        64.4 |
| trpc      |         84,740 | 23,475 |        46.2 |
| trpc-zod  |        213,567 | 43,277 |        70.6 |

#### 250 procedures

| Variant   | Instantiations |  Types | Memory (MB) |
| --------- | -------------: | -----: | ----------: |
| basic     |     **78,588** | 21,954 |        56.2 |
| trpc-like |        370,859 | 78,491 |       104.0 |
| trpc      |        191,510 | 46,635 |        65.5 |
| trpc-zod  |        511,587 | 93,887 |       114.8 |

#### 500 procedures

| Variant   | Instantiations |   Types | Memory (MB) |
| --------- | -------------: | ------: | ----------: |
| basic     |    **153,138** |  41,904 |        85.5 |
| trpc-like |        727,909 | 149,191 |       169.8 |
| trpc      |        369,460 |  85,235 |        97.2 |
| trpc-zod  |      1,008,287 | 178,237 |       188.1 |

TypeScript 7.0.2, tRPC 11.19.0, zod 4.6.7.

### Methodology

`scripts/gen-bench.mjs` generates the same API in each variant: N procedures,
each with its own input and output type, plus a `usage.ts` that calls every
procedure once. `scripts/bench-types.mjs` type-checks each `usage.ts` and its
imports on its own with `tsc --extendedDiagnostics`, using the project's
`tsconfig.json`.

basic and trpc don't validate input at runtime, while trpc-like and trpc-zod
do, so compare basic with trpc and trpc-like with trpc-zod.

### Run it yourself

```bash
npm install
npm run bench:gen -- 1 10 50 100 250 500 --bench   # all variants and sizes
npm run bench:types -- src/examples/basic/client.ts  # any single file
```
