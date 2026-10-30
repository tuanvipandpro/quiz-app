import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';
import config from './vite.config.js';

export default defineConfig(({ command }) => {
  if (command === 'build')
    throw new Error('The E2E configuration must never build a deployable app.');
  return mergeConfig(config, {
    base: '/quiz-app/',
    server: { warmup: { clientFiles: ['./src/main.jsx', './src/App.jsx'] } },
    resolve: {
      alias: [
        {
          find: /^(?:.*\/)?customQuizService(?:\.js)?$/,
          replacement: fileURLToPath(
            new URL('./tests/fixtures/customQuizService.js', import.meta.url)
          ),
        },
        {
          find: /^(?:.*\/)?authService(?:\.js)?$/,
          replacement: fileURLToPath(new URL('./tests/fixtures/authService.js', import.meta.url)),
        },
        {
          find: /^(?:.*\/)?userService(?:\.js)?$/,
          replacement: fileURLToPath(new URL('./tests/fixtures/userService.js', import.meta.url)),
        },
      ],
    },
  });
});
