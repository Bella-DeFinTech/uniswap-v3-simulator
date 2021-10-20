import { ConfigurableCorePool } from "../core/ConfigurableCorePool";

export interface SimulatorRoadmapManager {
  printRoute(configurableCorePoolId: string): Promise<void>;

  listRoutes(): Array<ConfigurableCorePool>;

  persistRoute(
    configurableCorePoolId: string,
    description: string
  ): Promise<string>;

  loadAndPrintRoute(roadmapId: string): Promise<void>;
}
