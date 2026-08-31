// The request header src/proxy.ts sets so the root layout knows which path it
// renders. In its own module because the proxy bundle must not pull in the
// database client that count-page-load.tsx needs.
export const PATH_HEADER = "x-pathname";
