### Persisting & Recovering

If a state is important enough that you want to test something on it across multiple programs, e.g. suppose you want to test something important on the state after replaying 200,000 events from the deployment of a pool, you can replay those events for once, then persist everything as a snapshot and directly resume from then on to make the preparation faster.

```typescript
configurableCorePool.takeSnapshot("description for snapshot");
```

Then don't forget to persist it so that you can recover/resume later.

```typescript
let snapshotId: string = await configurableCorePool.persistSnapshot();
```

Later you can recover the pool from any snapshot in the internal database(local database file with default SQLite implementation).

```typescript
let recoveredConfigurableCorePool: ConfigurableCorePool =
  await clientInstance.recoverCorePoolFromSnapshot(snapshotId);
```

If you forget the snapshotId, you can list and check all snapshots by information like description or created timestamp.

```typescript
let snapshotProfiles: SnapshotProfile[] =
  await clientInstance.listSnapshotProfiles();
```
