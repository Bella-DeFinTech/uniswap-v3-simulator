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

  toString(): string {
    return `
    Roadmap:
        id: ${this.id}
        description: ${this.description}
        snapshotLength: ${this.snapshots.length}
        timestamp: ${this.timestamp}
    `;
  }
}
