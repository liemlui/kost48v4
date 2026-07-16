import { Client } from 'pg';

type QueryCallback = (error: Error | null, result?: unknown) => void;

/**
 * PostgreSQL only executes one query at a time on a connection. Prisma can
 * intentionally schedule relation queries concurrently inside an interactive
 * transaction, so serialize them before they reach pg's deprecated internal
 * client queue.
 */
export class SerializedPgClient extends Client {
  private queryTail: Promise<void> = Promise.resolve();

  protected executeQuery(config: unknown, values?: unknown, callback?: QueryCallback): unknown {
    return super.query(config as any, values as any, callback as any);
  }

  override query(config: any, values?: any, callback?: any): any {
    const queryCallback: QueryCallback | undefined =
      typeof values === 'function' ? values : callback;
    const queryValues = typeof values === 'function' ? undefined : values;

    if (queryCallback) {
      void this.enqueue(
        () =>
          new Promise<void>((resolve) => {
            const complete: QueryCallback = (error, result) => {
              try {
                queryCallback(error, result);
              } finally {
                resolve();
              }
            };

            try {
              this.executeQuery(config, queryValues, complete);
            } catch (error) {
              complete(error as Error);
            }
          }),
      );
      return undefined;
    }

    return this.enqueue(() => Promise.resolve(this.executeQuery(config, queryValues)));
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const execution = this.queryTail.then(operation);
    this.queryTail = execution.then(
      () => undefined,
      () => undefined,
    );
    return execution;
  }
}
