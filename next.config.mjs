import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');
const isDev = process.env.NODE_ENV !== 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://us-assets.i.posthog.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.basemaps.cartocdn.com",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: http://localhost:*' : ''} https://us.i.posthog.com https://us-assets.i.posthog.com https://*.basemaps.cartocdn.com`,
  "worker-src 'self' blob:",
  "frame-src 'self' https://us.posthog.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');
const embedFrameAncestors = [
  "'self'",
  ...(process.env.CLIENT_EMBED_FRAME_ANCESTORS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
].join(' ');
const embedContentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://us-assets.i.posthog.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: http://localhost:*' : ''} https://us.i.posthog.com https://us-assets.i.posthog.com`,
  `frame-ancestors ${embedFrameAncestors}`,
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  // PostHog reverse proxy — routes analytics through own domain so ad blockers don't drop events
  skipMiddlewareUrlNormalize: true,
  async headers() {
    return [
      {
        source: '/embed/lead-form',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: embedContentSecurityPolicy,
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
      {
        source: '/((?!embed/lead-form).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/vizual",
        destination: "/",
        statusCode: 301,
      },
      {
        source: "/kvartiralar",
        destination: "/apartments",
        statusCode: 301,
      },
      {
        source: "/projects/:projectId",
        destination: "/",
        statusCode: 301,
      },
      {
        source: "/projects/:projectId/explore",
        destination: "/",
        statusCode: 301,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
