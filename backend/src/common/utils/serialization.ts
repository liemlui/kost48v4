/**
 * Utility untuk menangani serialization data Prisma, khususnya Decimal dan Date.
 */

const PRIMITIVE_TYPES = new Set(['string', 'number', 'boolean', 'bigint', 'symbol']);
const decimalCache = new WeakMap<object, boolean>();

function isDecimal(obj: object): boolean {
  if (decimalCache.has(obj)) return decimalCache.get(obj)!;
  const result = obj.constructor?.name === 'Decimal' || typeof (obj as any).toNumber === 'function';
  decimalCache.set(obj, result);
  return result;
}

/**
 * Mengonversi objek Prisma menjadi format yang aman untuk JSON.
 * - Primitif (string, number, boolean, bigint, symbol) -> early return tanpa iterasi
 * - Decimal -> number (fallback string)
 * - Date -> ISO string
 */
export function safeSerialize<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (PRIMITIVE_TYPES.has(typeof data)) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => safeSerialize(item)) as any;
  }

  if (data instanceof Date) {
    return data.toISOString() as any;
  }

  if (typeof data === 'object' && data !== null) {
    if (isDecimal(data as object)) {
      try {
        return (data as any).toNumber() as any;
      } catch {
        return (data as any).toString() as any;
      }
    }

    const result: any = {};
    for (const key of Object.keys(data as object)) {
      result[key] = safeSerialize((data as any)[key]);
    }
    return result;
  }

  return data;
}

/**
 * Mengonversi hasil Prisma menjadi format yang aman untuk JSON.
 */
export function serializePrismaResult<T>(result: T): T {
  return safeSerialize(result);
}
