module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier"
  ],
  ignorePatterns: ["node_modules", "dist", "build", ".next", "coverage", "out"],
  settings: {
    "import/resolver": {
      typescript: {
        project: [
          "./tsconfig.json",
          "./apps/api/tsconfig.json",
          "./apps/web/tsconfig.json",
          "./packages/shared/tsconfig.json"
        ]
      },
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx", ".d.ts"]
      }
    }
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "import/order": [
      "warn",
      {
        groups: [["builtin", "external"], ["internal"], ["parent", "sibling", "index"]],
        "newlines-between": "always",
        pathGroups: [
          {
            pattern: "@quizgen/**",
            group: "internal",
            position: "after"
          }
        ],
        pathGroupsExcludedImportTypes: ["builtin"]
      }
    ],
    "import/no-named-as-default-member": "off"
  }
};
