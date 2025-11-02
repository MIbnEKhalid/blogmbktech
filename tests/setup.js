// Setup file for Jest tests
import { jest } from '@jest/globals';

// Mock multer
jest.mock('multer', () => {
    return () => ({
        none: () => (req, res, next) => next()
    });
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