/* eslint-env node */
module.exports = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: "tsconfig.json",
        tsconfigRootDir: __dirname,
        sourceType: "module",
    },
    plugins: ["@typescript-eslint"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
        "plugin:prettier/recommended",
    ],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["warn"],
    },
};
