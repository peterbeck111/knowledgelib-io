// jest.config.ts — monorepo root with multiple projects
import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'api',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/packages/api/src'],
      moduleNameMapper: {
        '^@api/(.*)$': '<rootDir>/packages/api/src/$1',
      },
    },
    {
      displayName: 'web',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/packages/web/src'],
      setupFilesAfterFramework: ['<rootDir>/packages/web/src/setupTests.ts'],
      moduleNameMapper: {
        '^@web/(.*)$': '<rootDir>/packages/web/src/$1',
        '\\.(css|less)$': 'identity-obj-proxy',
      },
    },
  ],
};

export default config;
