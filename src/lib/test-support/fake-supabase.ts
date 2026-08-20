// Minimal chainable Supabase mock for unit tests. Every query-builder method
// returns `this`; awaiting the builder resolves to whatever result was queued
// for that `.from(table)` call. insert()/update() payloads are recorded so
// tests can assert on what the code actually tried to write, not just on the
// canned return value. Not used by application code.

type QueryResult<T = unknown> = { data: T | null; error: Error | null }
type RecordedCall = { table: string; method: 'insert' | 'update' | 'upsert' | 'delete'; args: unknown }

class FakeQuery<T = unknown> implements PromiseLike<QueryResult<T>> {
  constructor(
    private result: QueryResult<T>,
    private table: string,
    private onCall: (call: RecordedCall) => void
  ) {}
  select() { return this }
  eq() { return this }
  neq() { return this }
  gte() { return this }
  in() { return this }
  contains() { return this }
  is() { return this }
  not() { return this }
  or() { return this }
  ilike() { return this }
  order() { return this }
  limit() { return this }
  insert(args: unknown) {
    this.onCall({ table: this.table, method: 'insert', args })
    return this
  }
  update(args: unknown) {
    this.onCall({ table: this.table, method: 'update', args })
    return this
  }
  upsert(args: unknown) {
    this.onCall({ table: this.table, method: 'upsert', args })
    return this
  }
  delete() {
    this.onCall({ table: this.table, method: 'delete', args: undefined })
    return this
  }
  single() { return this }
  maybeSingle() { return this }
  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected)
  }
}

export function createFakeSupabase(queued: Record<string, QueryResult[]>) {
  const cursors: Record<string, number> = {}
  const rpcCalls: { name: string; args: unknown }[] = []
  const calls: RecordedCall[] = []

  return {
    from(table: string) {
      const queue = queued[table] ?? []
      const i = cursors[table] ?? 0
      cursors[table] = i + 1
      const result = queue[i] ?? { data: null, error: null }
      return new FakeQuery(result, table, (call) => calls.push(call))
    },
    async rpc(name: string, args: unknown) {
      rpcCalls.push({ name, args })
      return { data: null, error: null }
    },
    storage: {
      from(bucket: string) {
        return {
          getPublicUrl(path: string) {
            return { data: { publicUrl: `https://fake.supabase.co/storage/v1/object/public/${bucket}/${path}` } }
          },
        }
      },
    },
    _rpcCalls: rpcCalls,
    _calls: calls,
  }
}
