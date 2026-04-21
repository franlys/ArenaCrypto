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

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify(email) {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
    console.error("Usuario no encontrado en auth.users");
    return;
  }
  
  console.log("User found in auth.users, ID:", user.id);
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
    
  if (profile) {
    console.log("Profile data:", profile);
  } else {
    console.log("No profile found for user ID:", user.id);
  }
}

verify("elmaestrogonzalez30@gmail.com");
