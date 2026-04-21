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
const adminKey = envMap["SUPABASE_SERVICE_ROLE_KEY"];
const anonKey = envMap["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

const adminClient = createClient(supabaseUrl, adminKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function testRLS(email) {
  // Get uid via admin
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  console.log("User ID:", user.id);
  
  // Pretend we are this user logging in via ANON with temporary token...
  // Since we don't have password, we can generate a temporary JWT... wait, we can't easily.
  // Instead, let's just do an ANON query on profiles and see what we get.
  const { data, error } = await anonClient.from('profiles').select('*').limit(1);
  console.log("Anon profile select:", data, error);
}

testRLS("elmaestrogonzalez30@gmail.com");
