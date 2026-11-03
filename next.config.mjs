/** @type {import('next').NextConfig} */
const nextConfig = {
  // The app does not use next/image. Disable the Image Optimization API so
  // /_next/image cannot be used as an open fetch-and-decode proxy for
  // arbitrary remote hosts (see issue #9). No remotePatterns are allowed.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
