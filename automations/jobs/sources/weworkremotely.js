const endpoint =
  "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss";

function getTagContent(xmlText, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xmlText.match(regex);
  if (!match) return "";
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .trim();
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function fetchWeWorkRemotelyJobs() {
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "Pike job tracker" },
  });

  if (!response.ok) {
    throw new Error(`WeWorkRemotely request failed (${response.status})`);
  }

  const xmlText = await response.text();
  const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/gi) || [];

  return itemMatches
    .map((itemXml) => {
      const rawTitle = getTagContent(itemXml, "title");
      const creator =
        getTagContent(itemXml, "creator") ||
        getTagContent(itemXml, "dc:creator");
      const link =
        getTagContent(itemXml, "link") || getTagContent(itemXml, "guid");
      const pubDateStr = getTagContent(itemXml, "pubDate");
      const description = getTagContent(itemXml, "description");
      const skills = getTagContent(itemXml, "skills");
      const region = getTagContent(itemXml, "region");
      const country = getTagContent(itemXml, "country");
      const category = getTagContent(itemXml, "category");

      let company = creator;
      let title = rawTitle;

      if (!company && rawTitle.includes(":")) {
        const parts = rawTitle.split(":");
        company = parts[0].trim();
        title = parts.slice(1).join(":").trim();
      }

      if (!company) {
        company = "WeWorkRemotely";
      }

      let foundAt = pubDateStr;
      if (pubDateStr && !isNaN(Date.parse(pubDateStr))) {
        foundAt = new Date(pubDateStr).toISOString();
      }

      const searchableText = [
        rawTitle,
        company,
        category,
        skills,
        region,
        country,
        stripHtml(description),
      ]
        .filter(Boolean)
        .join(" ");

      return {
        title: title || rawTitle,
        company,
        link,
        source: "WeWorkRemotely",
        found_at: foundAt || new Date().toISOString(),
        searchableText,
      };
    })
    .filter(
      (job) => job.title && job.company && job.link && job.found_at
    );
}
