type TagListProps = {
  items?: string[];
};

export function TagList({ items }: TagListProps) {
  if (!items?.length) return null;

  return (
    <div className="tag-list">
      {items.map((tag) => (
        <span key={tag} className="tag">
          {tag}
        </span>
      ))}
    </div>
  );
}
