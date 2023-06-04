module.exports = {
  roots: ['<rootDir>/src'],
  testMatch: [
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  moduleDirectories: ['node_modules', 'src'],
  testTimeout: 30000,
  collectCoverage: true,
  collectCoverageFrom: [
    "**/*.{ts,tsx}", // Include TypeScript files only
    "!**/index.{ts,tsx}", // Exclude index.ts
    "!**/node_modules/**" // Exclude node_modules
  ],
  coverageReporters: ["text", "lcov"],
}
