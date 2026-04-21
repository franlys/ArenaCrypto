import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
const envMap = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envMap[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envMap["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseKey = envMap["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setAdmin(email) {
  // 1. Find user in auth.users (via admin API)
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error("Error obteniendo usuarios:", authError);
    return;
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`Usuario no encontrado con correo: ${email}`);
    return;
  }

  // 2. Update role in public.profiles
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", user.id);

  if (updateError) {
    console.error("Error al actualizar la tabla profiles:", updateError);
  } else {
    console.log(`¡Éxito! Se ha restaurado el rol admin a: ${email}`);
  }
}

setAdmin("elmaestrogonzalez30@gmail.com");
