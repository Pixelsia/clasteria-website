// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';
import pluginVue from 'eslint-plugin-vue';
import stylistic from '@stylistic/eslint-plugin';
import compat from 'eslint-plugin-compat';

export default withNuxt([
  ...pluginVue.configs['flat/recommended'],
  stylistic.configs.customize({
    semi: true,
  }),
  compat.configs['flat/recommended'],
  {
    rules: {
      'max-len': ['error', { code: 120, ignoreTemplateLiterals: true, ignoreStrings: true }],
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'max-len': 'off',
      'vue/max-len': ['error', {
        code: 120,
        ignoreTemplateLiterals: true,
        ignoreStrings: true,
        ignoreHTMLAttributeValues: true,
      }],
      'vue/block-order': ['error', {
        order: ['script', 'template', 'style'],
      }],
    },
  },
]);
