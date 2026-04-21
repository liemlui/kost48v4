/**
 * Utility untuk menangani serialization data Prisma, khususnya Decimal
 */

/**
 * Mengonversi objek Prisma dengan field Decimal menjadi objek JSON yang aman
 * Decimal di-convert ke string atau number untuk menghindari serialization error
 */
export function safeSerialize<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => safeSerialize(item)) as any;
  }

  if (typeof data === 'object' && data !== null) {
    // Handle Prisma Decimal type
    if (data.constructor && data.constructor.name === 'Decimal') {
      // Convert Decimal to number
      try {
        return (data as any).toNumber() as any;
      } catch {
        // Fallback to string
        return (data as any).toString() as any;
      }
    }

    // Check for toNumber method (alternative Decimal detection)
    if ((data as any).toNumber && typeof (data as any).toNumber === 'function') {
      try {
        return (data as any).toNumber() as any;
      } catch {
        return (data as any).toString() as any;
      }
    }

    // Recursively process object properties
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = safeSerialize(value);
    }
    return result;
  }

  return data;
}

/**
 * Mengonversi array hasil Prisma findMany menjadi format yang aman untuk JSON
 */
export function serializePrismaResult<T>(result: T): T {
  return safeSerialize(result);
}
