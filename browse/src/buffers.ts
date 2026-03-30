/**
 * 共享缓冲区和类型 — 提取以打破 server.ts 和 browser-manager.ts 之间的循环依赖
 *
 * CircularBuffer<T>: O(1) 插入环形缓冲区，固定容量。
 *
 *   ┌───┬───┬───┬───┬───┬───┐
 *   │ 3 │ 4 │ 5 │   │ 1 │ 2 │  capacity=6, head=4, size=5
 *   └───┴───┴───┴───┴─▲─┴───┘
 *                      │
 *                    head (最旧的条目)
 *
 *   push() 在 (head+size) % capacity 处写入，O(1)
 *   toArray() 按插入顺序返回条目，O(n)
 *   totalAdded 持续递增超过容量（刷新游标）
 */

// ─── CircularBuffer ─────────────────────────────────────────

export class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private head: number = 0;
  private _size: number = 0;
  private _totalAdded: number = 0;
  readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(entry: T): void {
    const index = (this.head + this._size) % this.capacity;
    this.buffer[index] = entry;
    if (this._size < this.capacity) {
      this._size++;
    } else {
      // 缓冲区已满 — 推进 head（覆盖最旧的）
      this.head = (this.head + 1) % this.capacity;
    }
    this._totalAdded++;
  }

  /** 按插入顺序返回条目（最旧的在前） */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this._size; i++) {
      result.push(this.buffer[(this.head + i) % this.capacity] as T);
    }
    return result;
  }

  /** 返回最后 N 个条目（最新的在前 → 反转为最旧的在前） */
  last(n: number): T[] {
    const count = Math.min(n, this._size);
    const result: T[] = [];
    const start = (this.head + this._size - count) % this.capacity;
    for (let i = 0; i < count; i++) {
      result.push(this.buffer[(start + i) % this.capacity] as T);
    }
    return result;
  }

  get length(): number {
    return this._size;
  }

  get totalAdded(): number {
    return this._totalAdded;
  }

  clear(): void {
    this.head = 0;
    this._size = 0;
    // 不重置 totalAdded — 刷新游标依赖它
  }

  /** 按索引获取条目（0 = 最旧的） — 用于网络响应匹配 */
  get(index: number): T | undefined {
    if (index < 0 || index >= this._size) return undefined;
    return this.buffer[(this.head + index) % this.capacity];
  }

  /** 按索引设置条目（0 = 最旧的） — 用于网络响应匹配 */
  set(index: number, entry: T): void {
    if (index < 0 || index >= this._size) return;
    this.buffer[(this.head + index) % this.capacity] = entry;
  }
}

// ─── 条目类型 ────────────────────────────────────────────

export interface LogEntry {
  timestamp: number;
  level: string;
  text: string;
}

export interface NetworkEntry {
  timestamp: number;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  size?: number;
}

export interface DialogEntry {
  timestamp: number;
  type: string;        // 'alert' | 'confirm' | 'prompt' | 'beforeunload'
  message: string;
  defaultValue?: string;
  action: string;      // 'accepted' | 'dismissed'
  response?: string;   // 为 prompt 提供的文本
}

// ─── 缓冲区实例 ───────────────────────────────────────

const HIGH_WATER_MARK = 50_000;

export const consoleBuffer = new CircularBuffer<LogEntry>(HIGH_WATER_MARK);
export const networkBuffer = new CircularBuffer<NetworkEntry>(HIGH_WATER_MARK);
export const dialogBuffer = new CircularBuffer<DialogEntry>(HIGH_WATER_MARK);

// ─── 便捷添加函数 ──────────────────────────────

export function addConsoleEntry(entry: LogEntry) {
  consoleBuffer.push(entry);
}

export function addNetworkEntry(entry: NetworkEntry) {
  networkBuffer.push(entry);
}

export function addDialogEntry(entry: DialogEntry) {
  dialogBuffer.push(entry);
}
