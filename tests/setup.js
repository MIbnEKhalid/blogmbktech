// Setup file for Jest tests
import { jest } from '@jest/globals';

// Mock multer
jest.mock('multer', () => {
    const multerMock = jest.fn(() => ({
        none: () => (req, res, next) => next(),
        single: () => (req, res, next) => next(),
        array: () => (req, res, next) => next()
    }));
    
    // Add diskStorage method to the mock
    multerMock.diskStorage = jest.fn(() => ({}));
    multerMock.memoryStorage = jest.fn(() => ({}));
    
    return multerMock;
});

// Create mockable objects with jest.fn
export const mockPoolQuery = jest.fn();
export const mockClientRelease = jest.fn();

// Create a mock client with a query method that can be replaced per test
export const mockClient = {
    query: jest.fn(),
    release: mockClientRelease
};

// Mock pool.connect to return the mock client
export const mockPoolConnect = jest.fn().mockResolvedValue(mockClient);

export const mockPool = {
    query: mockPoolQuery,
    connect: mockPoolConnect
};

jest.mock('../routes/pool.js', () => ({
    pool: {
        query: mockPoolQuery,
        connect: mockPoolConnect
    }
}));