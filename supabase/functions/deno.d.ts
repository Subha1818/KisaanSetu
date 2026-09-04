// Ambient type declarations for Supabase Edge Functions in non-Deno IDE environments
declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
  };
}
