import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR_NAME = '.agentrelay';
const CONFIG_FILE_NAME = 'config.json';
const AUTH_FILE_NAME = 'auth.json';

export function getAgentRelayDir() {
  const customPath = process.env.AGENTRELAY_HOME || process.env.LCP_HOME;
  if (customPath) {
    return path.resolve(customPath);
  }
  return path.join(os.homedir(), CONFIG_DIR_NAME);
}

export function getConfigFilePath() {
  return path.join(getAgentRelayDir(), CONFIG_FILE_NAME);
}

export function getAuthFilePath() {
  return path.join(getAgentRelayDir(), AUTH_FILE_NAME);
}

export function getDefaultConfig() {
  return {
    scopes: [],
    paused: false,
    modelRuntimeUrl: process.env.MODEL_RUNTIME_URL || 'http://localhost:11434',
    modelName: process.env.MODEL_NAME || 'qwen2.5-coder:7b',
    serverUrl: process.env.SERVER_URL || 'http://localhost:3001',
    retentionDays: 14,
    updatedAt: new Date().toISOString(),
  };
}

export function loadConfig() {
  const dir = getAgentRelayDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = getConfigFilePath();
  if (!fs.existsSync(filePath)) {
    const defaultConfig = getDefaultConfig();
    fs.writeFileSync(filePath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    return defaultConfig;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return { ...getDefaultConfig(), ...JSON.parse(raw) };
  } catch {
    return getDefaultConfig();
  }
}

export function saveConfig(config) {
  const dir = getAgentRelayDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const updated = { ...config, updatedAt: new Date().toISOString() };
  fs.writeFileSync(getConfigFilePath(), JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export function loadAuth() {
  const filePath = getAuthFilePath();
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuth(authData) {
  const dir = getAgentRelayDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = getAuthFilePath();
  fs.writeFileSync(filePath, JSON.stringify(authData, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

export function clearAuth() {
  const filePath = getAuthFilePath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
