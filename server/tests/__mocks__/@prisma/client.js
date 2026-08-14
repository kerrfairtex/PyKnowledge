// Mock Prisma Client for unit tests
// This avoids the ESM import issues with @prisma/client

function createMockFn(implementation) {
  let callCount = 0;
  const implementations = [];
  let defaultImpl = implementation || (() => Promise.resolve(null));
  
  const mockFn = (...args) => {
    const impl = implementations[callCount] || defaultImpl;
    callCount++;
    return impl(...args);
  };
  
  mockFn.mockImplementation = (impl) => {
    defaultImpl = impl;
    return mockFn;
  };
  
  mockFn.mockResolvedValue = (value) => {
    defaultImpl = () => Promise.resolve(value);
    return mockFn;
  };
  
  mockFn.mockRejectedValue = (value) => {
    defaultImpl = () => Promise.reject(value);
    return mockFn;
  };
  
  mockFn.mockResolvedValueOnce = (value) => {
    implementations.push(() => Promise.resolve(value));
    return mockFn;
  };
  
  mockFn.mockRejectedValueOnce = (value) => {
    implementations.push(() => Promise.reject(value));
    return mockFn;
  };
  
  mockFn.mockClear = () => {
    callCount = 0;
    implementations.length = 0;
    return mockFn;
  };
  
  return mockFn;
}

export const mockPrisma = {
  user: {
    findUnique: createMockFn(),
    create: createMockFn(),
    findFirst: createMockFn(),
    findMany: createMockFn(() => Promise.resolve([])),
    update: createMockFn(),
    delete: createMockFn(),
  },
  institution: {
    findFirst: createMockFn(),
    create: createMockFn(),
    findUnique: createMockFn(),
    findMany: createMockFn(() => Promise.resolve([])),
    update: createMockFn(),
  },
  contentManifest: {
    findFirst: createMockFn(),
    create: createMockFn(),
    findMany: createMockFn(() => Promise.resolve([])),
    findUnique: createMockFn(),
    update: createMockFn(),
  },
  progress: {
    findMany: createMockFn(() => Promise.resolve([])),
    findUnique: createMockFn(),
    create: createMockFn(),
    update: createMockFn(),
    upsert: createMockFn(),
    delete: createMockFn(),
  },
  $queryRaw: createMockFn(() => Promise.resolve([{ '?column?': 1 }])),
  $disconnect: createMockFn(() => Promise.resolve(undefined)),
};

export const PrismaClient = class {
  constructor() {
    return mockPrisma;
  }
};

export default { PrismaClient, prisma: mockPrisma };