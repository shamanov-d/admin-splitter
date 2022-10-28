module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "prettier/@typescript-eslint",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  settings: {
    "import/extensions": [".ts"],
    "import/internal-regex": "^src",
  },
  rules: {
    "no-duplicate-imports": "warn",
    "comma-spacing": [
      "warn",
      {
        before: false,
        after: true,
      },
    ],
    "no-case-declarations": "off",
    "@typescript-eslint/array-type": [
      "warn",
      {
        default: "array-simple",
      },
    ],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/no-type-alias": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-object-literal-type-assertion": "off",
    "@typescript-eslint/no-parameter-properties": "off",
    "@typescript-eslint/no-var-requires": "off",
    "no-unused-vars": "off",
    "prefer-rest-params": "off",
    "linebreak-style": [
      "warn",
      require("os").EOL === "\r\n" ? "windows" : "unix",
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        args: "none",
        ignoreRestSiblings: true,
      },
    ],
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/prefer-interface": "off",
    "@typescript-eslint/no-inferrable-types": [
      "warn",
      {
        ignoreParameters: true,
      },
    ],
    "no-empty-function": "off",
    "@typescript-eslint/no-empty-function": [
      "error",
      {
        allow: ["arrowFunctions"],
      },
    ],
    "@typescript-eslint/ban-ts-ignore": "off",
    "@typescript-eslint/camelcase": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-namespace": "off",
  },
};
