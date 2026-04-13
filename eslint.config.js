import js from "@eslint/js";
import globals from "globals";

/** Cross-script globals (load order in index.html). */
const gameGlobals = {
  Phaser: "readonly",
  DanMath: "readonly",
  TrailProjection: "readonly",
  BootScene: "readonly",
  GameScene: "readonly",
  UIScene: "readonly",
  DanCharacter: "readonly",
  DanRunnerRig: "readonly",
  DanRunnerRender: "readonly",
  ObstacleManager: "readonly",
  TrailRenderer: "readonly",
  Obstacle: "readonly",
  SodaCan: "readonly",
  Snake: "readonly",
  Stream: "readonly",
  RunnerNpc: "readonly",
};

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...gameGlobals,
      },
    },
    rules: {
      "no-redeclare": "off",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^(BootScene|GameScene|UIScene|game)$",
        },
      ],
    },
  },
  {
    files: ["js/DanMath.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        exports: "readonly",
      },
    },
  },
  {
    files: ["eslint.config.js", "vitest.config.js", "playwright.config.js", "tests/**/*.js", "e2e/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: ["node_modules/**"],
  },
];
