export const techKeywords = [
  "react",
  "next.js",
  "nextjs",
  "typescript",
  "javascript",
  "frontend",
  "front-end",
  "front end",
  "web developer",
  "full stack",
  "fullstack",
  "software engineer",
  "software developer",
];

export const excludeKeywords = [
  "procurement",
  "architectural",
  "brand strategy",
  "accountant",
  "recruiter",
  "sales executive",
  "customer support",
];

export function isMatchingJob(listing) {
  const titleLower = (listing.title || "").toLowerCase();
  const searchableText = (listing.searchableText || "").toLowerCase();

  const matchesExclude = excludeKeywords.some(
    (kw) => titleLower.includes(kw) || searchableText.includes(kw)
  );
  if (matchesExclude) return false;

  const matchesTech = techKeywords.some(
    (kw) => titleLower.includes(kw) || searchableText.includes(kw)
  );
  return matchesTech;
}
