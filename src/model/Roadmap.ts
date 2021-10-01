import { IDGenerator } from "../util/IDGenerator";

export class Roadmap {
  readonly id: string;
  readonly description: string;
  readonly snapshots: number[];
  readonly timestamp: Date;

  constructor(description: string, snapshots: number[]) {
    this.id = IDGenerator.guid();
    this.description = description;
    this.snapshots = snapshots;
    this.timestamp = new Date();
  }
}

export function toString(roadmap: Roadmap): string {
  return `
    Roadmap:
        id: ${roadmap.id}
        description: ${roadmap.description}
        snapshotLength: ${roadmap.snapshots.length}
        timestamp: ${roadmap.timestamp}
  `;
}
