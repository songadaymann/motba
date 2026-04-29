import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function main() {
  const email = "jonathan@jonathanmann.net";
  const password = "motba-admin-2026";

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.log("Error creating user:", error.message);
    return;
  }

  console.log("Created admin user:");
  console.log("  Email:", email);
  console.log("  Password:", password);
  console.log("  User ID:", data.user.id);
}

main();
