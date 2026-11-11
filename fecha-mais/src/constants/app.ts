import Constants from 'expo-constants';

export const APP_NAME = 'Fecha+';
export const APP_SLOGAN = 'Venda mais. Esqueça menos.';
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

/**
 * Etapa atual do desenvolvimento. Enquanto o login (Supabase) não estiver
 * pronto, o app roda em "modo prévia" e NÃO exibe dados de clientes.
 */
export const DEV_STAGE = 'Etapa 1 · Fundação';
