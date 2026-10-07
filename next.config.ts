import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 한국어판과 영어판은 같은 버킷의 /ko/, /en/ 아래에 따로 올라간다. 자산 주소에 언어를 붙여 두면
  // 어느 주소로 열든 그 판의 자산을 받는다(scripts/build-locales.mjs).
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
  experimental: {
    useTypeScriptCli: false,
  },
  images: {
    unoptimized: true,
  },
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
