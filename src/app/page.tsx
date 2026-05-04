import { getHomeArtworks } from "@/lib/d1";
import { HomeExperience, type HomeArtwork } from "./home-experience";

export const dynamic = "force-dynamic";

function pickInitialHeroId(artworks: HomeArtwork[]): string | null {
  const candidates = artworks.filter((artwork) =>
    Boolean(artwork.hero_image_cloudinary_id)
  );
  if (candidates.length === 0) return null;

  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

export default async function HomePage() {
  const artworks = (await getHomeArtworks()) as HomeArtwork[];

  return (
    <HomeExperience
      artworks={artworks}
      initialHeroArtworkId={pickInitialHeroId(artworks)}
      generatedAt={new Date().toISOString()}
      spaceMonoClassName="motba-home-mono"
      bodyTextClassName="motba-home-body"
    />
  );
}
