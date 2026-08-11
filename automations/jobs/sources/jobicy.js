const endpoint =
  "https://jobicy.com/api/v2/remote-jobs?count=50&industry=engineering";

export async function fetchJobicyJobs() {
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "Pike job tracker" },
  });

  if (!response.ok) {
    throw new Error(`Jobicy request failed (${response.status})`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload.jobs)) {
    throw new Error("Jobicy returned an unexpected response shape");
  }

  return payload.jobs
    .filter(
      (job) =>
        job.jobTitle && job.companyName && job.url && job.pubDate
    )
    .map((job) => {
      let foundAt = job.pubDate;
      if (typeof job.pubDate === "string" && !isNaN(Date.parse(job.pubDate))) {
        foundAt = new Date(job.pubDate).toISOString();
      }

      return {
        title: job.jobTitle.trim(),
        company: job.companyName.trim(),
        link: job.url,
        source: "Jobicy",
        found_at: foundAt || new Date().toISOString(),
        searchableText: [
          job.jobTitle,
          job.companyName,
          job.jobIndustry,
          job.jobType,
          job.jobGeo,
          job.jobLevel,
          job.jobExcerpt,
          job.jobDescription,
        ]
          .filter(Boolean)
          .join(" "),
      };
    });
}
