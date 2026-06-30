import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || "https://htjjaiscdekasnfbpqxj.supabase.co";
  // Escape supabaseUrl for regex
  const escapedUrl = supabaseUrl.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const urlPattern = new RegExp(`^${escapedUrl}\/functions\/v1\/.*`, "i");

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
          runtimeCaching: [
            {
              urlPattern,
              handler: "NetworkOnly", // Always try network first for Edge Functions
            }
          ]
        },
        manifest: {
          name: "College Attendance System",
          short_name: "Attendance",
          description: "Mobile-friendly PWA for student, representative, and teacher attendance tracking.",
          theme_color: "#09090B",
          background_color: "#09090B",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          icons: [
            {
              src: "icon-192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "icon-512.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ]
        }
      })
    ]
  };
});

