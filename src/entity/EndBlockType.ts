export type EndBlockTypeWhenInit =
  | number
  | "latest"
  | "afterDeployment"
  | "afterInitialization";

export type EndBlockTypeWhenRecover =
  | number
  | "latestOnChain"
  | "latestDownloaded"
  | "afterDeployment"
  | "afterInitialization";
