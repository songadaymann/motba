import type { DeepZoomGallery } from "@/types/database";
import { r2PublicUrl } from "@/lib/cloudinary/config";
import { DeepZoomGalleryViewer } from "@/components/DeepZoomGalleryViewer";

type DeepZoomGallerySectionProps = {
  galleries: DeepZoomGallery[];
  heading?: string;
};

export function DeepZoomGallerySection({
  galleries,
  heading = "Deep zoom archive",
}: DeepZoomGallerySectionProps) {
  const visibleGalleries = [...galleries]
    .filter((gallery) => gallery.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (visibleGalleries.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold">{heading}</h2>
      <div className="space-y-6">
        {visibleGalleries.map((gallery) => (
          <DeepZoomGalleryViewer
            key={gallery.id}
            title={gallery.title}
            description={gallery.description}
            tileSourceUrl={r2PublicUrl(gallery.tile_source_key)}
            previewUrl={r2PublicUrl(`${gallery.r2_prefix}/preview.jpg`)}
            imageCount={gallery.image_count}
            width={gallery.width}
            height={gallery.height}
          />
        ))}
      </div>
    </section>
  );
}
