import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Variáveis SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias no .env"
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export function createSupabaseClient(token: string): SupabaseClient {
  return createClient(supabaseUrl!, supabaseKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
