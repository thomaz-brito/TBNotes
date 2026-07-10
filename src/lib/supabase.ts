import { createClient } from "@supabase/supabase-js";

// Conexão com o Supabase (banco Postgres na nuvem).
// A chave "anon" é pública por design — a segurança vem do login (Auth)
// e das regras de Row Level Security definidas em supabase/schema.sql,
// que garantem que cada usuário só acessa as próprias linhas.

const SUPABASE_URL = "https://ushmyinsnxncqlecasms.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaG15aW5zbnhuY3FsZWNhc21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NDE0NTMsImV4cCI6MjA5OTIxNzQ1M30.8K2KL2Kh3B9JAAKftTfSEreC-9BWkeuiDPiGL0Wf8Oo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
