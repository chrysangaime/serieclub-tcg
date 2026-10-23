// SériesClubTCG V1.0 — fermeture définitive du compte sur action explicite du titulaire.
// Aucun secret de service n'est expédié au navigateur.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const SITE_ORIGIN = "https://chrysangaime.github.io";
function cors(origin: string | null): HeadersInit {
 const expected = new Set([SITE_ORIGIN]);
 const configured = Deno.env.get("PUBLIC_SITE_URL");
 if (configured) {
  try { expected.add(new URL(configured).origin); } catch { /* configuration inconnue */ }
 }
 const trusted = origin && expected.has(origin);
 return {
  ...(trusted ? { "Access-Control-Allow-Origin": origin!, "Vary": "Origin" } : {}),
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
 };
}
function respond(body: Record<string, unknown>, status: number, origin: string | null) {
 return new Response(JSON.stringify(body), { status, headers: cors(origin) });
}
Deno.serve(async (request: Request) => {
 const origin = request.headers.get("origin");
 if (origin) {
  const configured = Deno.env.get("PUBLIC_SITE_URL");
  const allowed = [SITE_ORIGIN];
  if (configured) { try { allowed.push(new URL(configured).origin); } catch { /* ignore */ } }
  if (!allowed.includes(origin)) return respond({error:"Origine non autorisée"},403,null);
 }
 if (request.method === "OPTIONS") return new Response(null,{status:204,headers:cors(origin)});
 if (request.method !== "POST") return respond({error:"Méthode non autorisée"},405,origin);
 const token = request.headers.get("Authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
 if (!token || token.startsWith("sb_")) return respond({error:"Connexion requise"},401,origin);
 const url=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if (!url || !serviceKey) return respond({error:"Service temporairement indisponible"},503,origin);
 try {
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const { data: {user}, error } = await admin.auth.getUser(token);
  if (error || !user?.id || !user.email) return respond({error:"Session invalide"},401,origin);
  let payload: unknown;
  try { payload=await request.json(); } catch { return respond({error:"Demande invalide"},400,origin); }
  if (!payload || typeof payload!=="object" ||
    (payload as Record<string,unknown>).confirmation!=="SUPPRIMER" ||
    String((payload as Record<string,unknown>).email||"").trim().toLowerCase()!==user.email.toLowerCase())
    return respond({error:"Confirmation ou adresse e-mail incorrecte"},400,origin);

  // Seule l'identité renvoyée par Auth est utilisée, jamais un user_id transmis par le client.
  const {error: deletionError}=await admin.auth.admin.deleteUser(user.id, false);
  if (deletionError) {
   console.error("Suppression de compte impossible",deletionError.code??"service_error");
   return respond({error:"Suppression impossible. Réessaie ou contacte l’éditeur."},500,origin);
  }
  return respond({deleted:true},200,origin);
 } catch (err) {
  console.error("Erreur inattendue account-delete",err instanceof Error?err.name:"unknown");
  return respond({error:"Service indisponible. Aucun effacement confirmé."},500,origin);
 }
});
