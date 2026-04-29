// Application data types shared across the Cloudflare D1 runtime and admin UI.

export type ArtCategory =
  | "music"
  | "art"
  | "writing"
  | "performance"
  | "photography";

export type VerificationStatus =
  | "verified"
  | "needs_verification"
  | "needs_input";

export type SubmissionStatus = "pending" | "approved" | "rejected";
export type ArtistMembershipRole = "owner" | "representative" | "contributor";
export type ArtistMembershipStatus = "invited" | "active" | "revoked";

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  website_url: string | null;
  artist_photo_cloudinary_id: string | null;
  born_year: number | null;
  died_year: number | null;
  nationality: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Artwork {
  id: string;
  artist_id: string;
  title: string;
  slug: string;
  category: ArtCategory;
  years_display: string | null;
  start_year: number | null;
  start_month: number | null;
  start_day: number | null;
  end_year: number | null;
  end_month: number | null;
  end_day: number | null;
  is_ongoing: boolean;
  description: string | null;
  external_url: string | null;
  hero_image_cloudinary_id: string | null;
  status: VerificationStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ArtworkImage {
  id: string;
  artwork_id: string;
  cloudinary_public_id: string;
  caption: string | null;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
}

export interface Submission {
  id: string;
  submitter_user_id: string | null;
  submitter_name: string;
  submitter_email: string;
  submitter_relationship: string | null;
  artist_name: string;
  artist_website: string | null;
  artist_photo_cloudinary_id: string | null;
  artwork_title: string;
  category: ArtCategory;
  years_display: string | null;
  start_year: number | null;
  end_year: number | null;
  is_ongoing: boolean;
  description: string | null;
  external_url: string | null;
  hero_image_cloudinary_id: string | null;
  gallery_image_ids: string[];
  status: SubmissionStatus;
  admin_notes: string | null;
  reviewed_at: string | null;
  approved_artist_id: string | null;
  approved_artwork_id: string | null;
  email_verified_at: string | null;
  verification_sent_at: string | null;
  private_token_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArtistMembership {
  id: string;
  user_id: string | null;
  artist_id: string;
  role: ArtistMembershipRole;
  status: ArtistMembershipStatus;
  invited_email: string | null;
  invited_by_email: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEntry {
  artwork_id: string;
  artist_id: string;
  artist_name: string;
  artist_slug: string;
  artist_photo_cloudinary_id: string | null;
  artwork_title: string;
  artwork_slug: string;
  category: ArtCategory;
  years_display: string | null;
  start_year: number | null;
  start_month: number | null;
  start_day: number | null;
  end_year: number | null;
  end_month: number | null;
  end_day: number | null;
  is_ongoing: boolean;
  hero_image_cloudinary_id: string | null;
  status: VerificationStatus;
  description: string | null;
  computed_start_date: string;
  computed_end_date: string;
}

export type LinkType = "video" | "article" | "website" | "social";

export interface ArtworkLink {
  id: string;
  artwork_id: string;
  url: string;
  title: string;
  description: string | null;
  link_type: LinkType;
  platform: string | null;
  embed_id: string | null;
  sort_order: number;
  created_at: string;
}

// Joined type for artist pages
export interface ArtistWithArtworks extends Artist {
  artworks: Artwork[];
}
