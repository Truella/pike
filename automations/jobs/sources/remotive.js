const endpoint = "https://remotive.com/api/remote-jobs";

export async function fetchRemotiveJobs() {
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`Remotive request failed (${response.status})`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload.jobs)) {
    throw new Error("Remotive returned an unexpected response shape");
  }

  return payload.jobs
    .filter(
      (job) =>
        job.title && job.company_name && job.url && job.publication_date,
    )
    .map((job) => ({
      title: job.title.trim(),
      company: job.company_name.trim(),
      link: job.url,
      source: "Remotive",
      found_at: job.publication_date,
      searchableText: [
        job.title,
        job.company_name,
        job.category,
        ...(Array.isArray(job.tags) ? job.tags : []),
        job.description,
        job.candidate_required_location,
        job.job_type,
      ]
        .filter(Boolean)
        .join(" "),
    }));
}
