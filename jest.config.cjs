module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.cjs"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text", "json-summary"],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
};
