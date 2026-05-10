import {
  AtSign,
  Cloud,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  MessageCircle,
  Music2,
  Send,
  Twitter,
  Video,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { ArtistSocialLink } from "@/types/database";
import { socialDisplayName, SOCIAL_PLATFORM_LABELS } from "@/lib/social-links";

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  instagram: Instagram,
  threads: AtSign,
  x: Twitter,
  twitter: Twitter,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: Music2,
  soundcloud: Cloud,
  bandcamp: Music2,
  vimeo: Video,
  linkedin: Linkedin,
  bluesky: Send,
  mastodon: MessageCircle,
  tumblr: AtSign,
  substack: AtSign,
  patreon: AtSign,
  website: Globe,
};

export function ArtistSocialLinks({
  links,
}: {
  links: ArtistSocialLink[];
}) {
  if (links.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {links.map((link) => {
        const Icon = PLATFORM_ICONS[link.platform] || ExternalLink;
        const title = socialDisplayName(link.platform, link.handle, link.label);
        const visibleLabel =
          link.label ||
          (link.handle ? `@${link.handle}` : SOCIAL_PLATFORM_LABELS[link.platform] || link.platform);

        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={title}
            aria-label={title}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{visibleLabel}</span>
          </a>
        );
      })}
    </div>
  );
}
