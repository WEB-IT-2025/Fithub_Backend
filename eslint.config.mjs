import eslintPluginPrettier from 'eslint-plugin-prettier';
import globals from 'globals';
import eslintPluginTs from '@typescript-eslint/eslint-plugin';

export default [
    {
        files: ['**/*.{js,mjs,cjs,ts}'],
        ignores: ['**/node_modules/**', '**/dist/**'],
        languageOptions: {
            globals: globals.node,
            parserOptions: {
                sourceType: 'module',
                project: './tsconfig.json',
            },
        },
        plugins: {
            prettier: eslintPluginPrettier,
            '@typescript-eslint': eslintPluginTs,
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': 'warn',
            'prettier/prettier': 'warn',
        },
    },
];
