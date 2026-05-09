export function tagToSlug(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/#/g, ' sharp')
    .replace(/\+/g, ' plus')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeTagSlug(value: string): string {
  try {
    return tagToSlug(decodeURIComponent(value));
  } catch {
    return tagToSlug(value);
  }
}

export function normalizeTags(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of values) {
    if (typeof item !== 'string') {
      continue;
    }

    const slug = tagToSlug(item);

    if (!slug || seen.has(slug)) {
      continue;
    }

    seen.add(slug);
    tags.push(slug);
  }

  return tags;
}
