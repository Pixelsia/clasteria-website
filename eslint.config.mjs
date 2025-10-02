// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';
import pluginVue from 'eslint-plugin-vue';
import stylistic from '@stylistic/eslint-plugin';

export default withNuxt([
  ...pluginVue.configs['flat/recommended'],
  stylistic.configs.customize({
    semi: true,
  }),
  {
    rules: {
      'max-len': ['error', { code: 120, ignoreTemplateLiterals: true, ignoreStrings: true }],
    },
  },
]);
