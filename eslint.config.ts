import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginOxlint from 'eslint-plugin-oxlint';
import skipFormatting from 'eslint-config-prettier/flat';

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,ts,tsx,vue}'],
  },

  includeIgnoreFile(fileURLToPath(new URL('.gitignore', import.meta.url))),

  ...pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_', ignoreRestSiblings: true },
      ],

      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'no-param-reassign': 'error',
      'no-nested-ternary': 'error',
      'no-duplicate-imports': 'error',
      'no-useless-assignment': 'off',

      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],
      camelcase: ['error', { properties: 'never' }],
      'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
      'prefer-destructuring': ['error', { array: true, object: true }, { enforceForRenamedProperties: false }],
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'arrow-parens': ['error', 'always'],
      'max-len': ['error', 160, 2],

      'vue/max-len': ['error', 160, 2],
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/require-default-prop': 'error',
      'vue/v-on-event-hyphenation': ['error', 'always', { autofix: true }],
      'vue/multi-word-component-names': 'error',
      'vue/require-explicit-emits': 'error',
      'vue/block-lang': 'off',
      'vue/no-undef-properties': 'error',
    },
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        Bun: 'readonly',
        process: 'readonly',
      },
    },
  },

  {
    files: ['wxt.config.*', 'eslint.config.*', 'preview/vite.config.*', 'scripts/**'],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ['tests/**/*.{ts,js}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'prefer-destructuring': 'off',
      'max-len': 'off',
    },
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting
);
