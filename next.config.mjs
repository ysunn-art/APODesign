/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
    // Prevent Next.js 14 from bundling pdfjs-dist/canvas so they load as
    // native Node.js modules and resolve the worker path correctly at runtime.
    serverComponentsExternalPackages: ["pdfjs-dist", "canvas"],
  },
  async redirects() {
    return [
      { source: "/hall-of-shame", destination: "/hall-of-fame", permanent: true },
    ];
  },
};

export default nextConfig;
