import {
  BaseDirectory,
  readDir,
  readTextFile,
} from "@tauri-apps/plugin-fs";

export type ThemeDefinition = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  darkNeutral: string;
  lightNeutral: string;
};

const THEMES_DIR = "themes";
const THEME_STORAGE_OPTIONS = { baseDir: BaseDirectory.AppData };
const SELECTED_THEME_KEY = "madschinese.selectedThemeId";
const BUILT_IN_THEME_FILES = [
  "default.json",
  "strawberry-matcha.json",
  "muted-pastel.json",
  "pastel-pink-blue.json",
  "matcha-sakura.json",
  "lavender-dream.json",
  "matcha-cafe.json",
  "rose-latte.json",
  "ocean-mist.json",
  "cream-mocha.json",
  "night-sakura.json",
  "midnight-matcha.json",
  "nord-soft.json",
];

export async function loadThemes(): Promise<ThemeDefinition[]> {
  const builtInThemes = await loadBuiltInThemes();
  const userThemes = await loadUserThemes();

  return mergeThemes(builtInThemes, userThemes);
}

export function getInitialTheme(themes: ThemeDefinition[]) {
  const selectedThemeId = window.localStorage.getItem(SELECTED_THEME_KEY);

  return getThemeById(themes, selectedThemeId) ?? themes[0] ?? null;
}

export function getThemeById(
  themes: ThemeDefinition[],
  themeId: string | null,
) {
  return themes.find((theme) => theme.id === themeId) ?? null;
}

export function saveSelectedThemeId(themeId: string) {
  window.localStorage.setItem(SELECTED_THEME_KEY, themeId);
}

export function isThemeDefinition(value: unknown): value is ThemeDefinition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const theme = value as Record<string, unknown>;

  return (
    typeof theme.id === "string" &&
    theme.id.trim().length > 0 &&
    typeof theme.name === "string" &&
    theme.name.trim().length > 0 &&
    isHexColor(theme.primary) &&
    isHexColor(theme.secondary) &&
    isHexColor(theme.accent) &&
    isHexColor(theme.darkNeutral) &&
    isHexColor(theme.lightNeutral)
  );
}

export function applyTheme(theme: ThemeDefinition) {
  const root = document.documentElement;
  const { primary, secondary, accent, darkNeutral, lightNeutral } = theme;

  setThemeValue(root, "primary", primary);
  setThemeValue(root, "secondary", secondary);
  setThemeValue(root, "accent", accent);
  setThemeValue(root, "dark", darkNeutral);
  setThemeValue(root, "light", lightNeutral);
}

function setThemeValue(root: HTMLElement, name: string, value: string) {
  root.style.setProperty(`--${name}`, value);
}

async function loadBuiltInThemes() {
  const themes: ThemeDefinition[] = [];

  for (const fileName of BUILT_IN_THEME_FILES) {
    const theme = await fetchBuiltInTheme(fileName);
    if (theme) {
      themes.push(theme);
    }
  }

  return themes;
}

async function fetchBuiltInTheme(fileName: string) {
  try {
    const response = await fetch(`/themes/${fileName}`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const parsed = await response.json();

    return isThemeDefinition(parsed) ? parsed : null;
  } catch (error) {
    console.warn(`Skipping built-in theme file: ${fileName}`, error);
    return null;
  }
}

async function loadUserThemes() {
  try {
    const entries = await readDir(THEMES_DIR, THEME_STORAGE_OPTIONS);
    const themes: ThemeDefinition[] = [];

    for (const entry of entries) {
      if (!entry.isFile || !entry.name.toLowerCase().endsWith(".json")) {
        continue;
      }

      const theme = await readThemeFile(`${THEMES_DIR}/${entry.name}`);
      if (theme) {
        themes.push(theme);
      }
    }

    return themes;
  } catch {
    return [];
  }
}

async function readThemeFile(path: string) {
  try {
    const contents = await readTextFile(path, THEME_STORAGE_OPTIONS);
    const parsed = JSON.parse(contents);

    return isThemeDefinition(parsed) ? parsed : null;
  } catch (error) {
    console.warn(`Skipping invalid theme file: ${path}`, error);
    return null;
  }
}

function mergeThemes(
  baseThemes: ThemeDefinition[],
  userThemes: ThemeDefinition[],
) {
  const themes = [...baseThemes];

  for (const userTheme of userThemes) {
    if (!themes.some((theme) => theme.id === userTheme.id)) {
      themes.push(userTheme);
    }
  }

  return themes;
}

function isHexColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}
