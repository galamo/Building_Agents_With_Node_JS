import type { SearchResult, UploadedImage } from "../types";
import { TagList } from "./TagList";

type ImageCardProps = {
  image: UploadedImage | SearchResult;
  showScores?: boolean;
};

function isSearchResult(
  image: UploadedImage | SearchResult
): image is SearchResult {
  return "relevanceScore" in image;
}

export function ImageCard({ image, showScores = false }: ImageCardProps) {
  return (
    <article className="image-card">
      <div className="image-wrap">
        <img src={image.imageUrl} alt={image.title || "Uploaded image"} />
      </div>
      <div className="image-meta">
        <h3>{image.title || "Untitled"}</h3>

        {showScores && isSearchResult(image) && (
          <div className="score-row">
            <span className="badge similarity">
              Vector {(image.similarity * 100).toFixed(0)}%
            </span>
            <span className="badge relevance">
              Relevance {(image.relevanceScore * 100).toFixed(0)}%
            </span>
          </div>
        )}

        {image.description && <p>{image.description}</p>}

        {showScores && isSearchResult(image) && image.rerankerReason && (
          <p>
            <strong>Why:</strong> {image.rerankerReason}
          </p>
        )}

        <TagList items={image.tags} />
        <TagList items={image.objects?.map((item) => `object: ${item}`)} />
      </div>
    </article>
  );
}
