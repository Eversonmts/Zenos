import { supabase } from './supabase';

export const CURRENT_VERSION = '2.1.2';

export interface AppVersionInfo {
  version: string;
  name: string;
  releaseDate?: string;
  notes?: string;
}

/**
 * Compara duas versões semânticas (ex: "2.1.2" e "2.1.3").
 * Retorna true se a versão candidate for superior à instalada.
 */
export function isNewerVersion(current: string, candidate: string): boolean {
  const currentParts = current.split('.').map(p => parseInt(p, 10) || 0);
  const candidateParts = candidate.split('.').map(p => parseInt(p, 10) || 0);

  const length = Math.max(currentParts.length, candidateParts.length);
  for (let i = 0; i < length; i++) {
    const curr = currentParts[i] || 0;
    const cand = candidateParts[i] || 0;
    if (cand > curr) return true;
    if (cand < curr) return false;
  }
  return false;
}

/**
 * Obtém a versão mais recente do aplicativo a partir de múltiplos canais (Supabase e JSON estático).
 * Retorna a maior versão encontrada se houver alguma pendente.
 */
export async function checkLatestVersion(): Promise<{
  latestVersion: string;
  isUpdateAvailable: boolean;
  notes?: string;
  releaseDate?: string;
}> {
  let latestFromJSON: any = null;
  let latestFromDB: any = null;

  // 1. Tenta obter o version.json estático com cache-buster
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });
    if (response.ok) {
      latestFromJSON = await response.json();
    }
  } catch (e) {
    console.debug("Static version check bypassed/offline:", e);
  }

  // 2. Tenta obter da tabela app_metadata no Supabase
  try {
    const { data } = await supabase.from('app_metadata').select('*').eq('id', 'config').maybeSingle();
    if (data) {
      latestFromDB = data;
    }
  } catch (e) {
    console.debug("Supabase version check bypassed/offline:", e);
  }

  // Compara e resolve a versão mais recente encontrada
  let activeLatest = CURRENT_VERSION;
  let activeNotes = '';
  let activeDate = '';

  if (latestFromJSON && isNewerVersion(activeLatest, latestFromJSON.version)) {
    activeLatest = latestFromJSON.version;
    activeNotes = latestFromJSON.notes || '';
    activeDate = latestFromJSON.releaseDate || '';
  }

  if (latestFromDB && isNewerVersion(activeLatest, latestFromDB.version)) {
    activeLatest = latestFromDB.version;
    activeNotes = latestFromDB.notes || '';
    activeDate = latestFromDB.release_date || '';
  }

  return {
    latestVersion: activeLatest,
    isUpdateAvailable: isNewerVersion(CURRENT_VERSION, activeLatest),
    notes: activeNotes || 'Melhorias de estabilidade, desempenho e interface do usuário.',
    releaseDate: activeDate || new Date().toISOString().split('T')[0]
  };
}

/**
 * Limpa todos os caches locais registrados e força a atualização do Service Worker,
 * forçando o carregamento total das novas folhas de estilo e recursos do aplicativo.
 */
export async function applyAndReloadUpdate(): Promise<void> {
  // 1. Limpa todos os caches de ativos do navegador
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
      console.log("Caches limpos com sucesso.");
    }
  } catch (e) {
    console.error("Erro ao limpar caches:", e);
  }

  // 2. Força atualização do Service Worker
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.update()));
      console.log("Service Worker atualizado.");
    }
  } catch (e) {
    console.error("Erro ao atualizar o Service Worker:", e);
  }

  // 3. Força o recarregamento definitivo
  window.location.reload();
}

/**
 * Publica uma nova versão no Supabase (Função de Administrador).
 * Isso fará com que todos os usuários ativos visualizem o prompt de atualização instantaneamente.
 */
export async function publishNewVersion(version: string, notes: string): Promise<void> {
  try {
    const { error } = await supabase.from('app_metadata').upsert({
      id: 'config',
      version: version.trim(),
      notes: notes.trim(),
      release_date: new Date().toISOString().split('T')[0]
    });
    if (error) throw error;
    console.log(`Nova versão pública ${version} registrada no Supabase.`);
  } catch (e) {
    console.error("Falha ao registrar versão no Supabase:", e);
    throw e;
  }
}
