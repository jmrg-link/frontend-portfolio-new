/**
 * Convención de mensajes de commit.
 *
 * El tipo se escribe en inglés, que es la convención de Conventional Commits, y la descripción en
 * español. `subject-case` queda desactivado porque su comprobación por defecto rechaza las
 * mayúsculas iniciales y los acentos habituales en castellano.
 */
const configuration = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'],
    ],
    'header-max-length': [2, 'always', 72],
    'subject-case': [0],
  },
};

export default configuration;
