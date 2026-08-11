const endpoint = "https://himalayas.app/jobs/api/search?q=frontend";

export async function fetchHimalayasJobs() {
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "Pike job tracker" },
  });

  if (!response.ok) {
    throw new Error(`Himalayas request failed (${response.status})`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload.jobs)) {
    throw new Error("Himalayas returned an unexpected response shape");
  }

  return payload.jobs
    .filter(
      (job) =>
        job.title &&
        job.companyName &&
        (job.applicationLink || job.guid) &&
        job.pubDate
    )
    .map((job) => {
      let foundAt = job.pubDate;
      if (typeof job.pubDate === "number") {
        foundAt = new Date(job.pubDate * 1000).toISOString();
      } else if (
        typeof job.pubDate === "string" &&
        !isNaN(Date.parse(job.pubDate))
      ) {
        foundAt = new Date(job.pubDate).toISOString();
      }

      return {
        title: job.title.trim(),
        company: job.companyName.trim(),
        link: job.applicationLink || job.guid,
        source: "Himalayas",
        found_at: foundAt || new Date().toISOString(),
        searchableText: [
          job.title,
          job.companyName,
          job.employmentType,
          job.excerpt,
          job.description,
          ...(Array.isArray(job.categories) ? job.categories : []),
          ...(Array.isArray(job.parentCategories) ? job.parentCategories : []),
          ...(Array.isArray(job.locationRestrictions)
            ? job.locationRestrictions
            : []),
        ]
          .filter(Boolean)
          .join(" "),
      };
    });
}
