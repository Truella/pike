const endpoint = "https://remoteok.com/api";

export async function fetchRemoteOkJobs() {
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "Pike job tracker" },
  });

  if (!response.ok) {
    throw new Error(`RemoteOK request failed (${response.status})`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload)) {
    throw new Error("RemoteOK returned an unexpected response shape");
  }

  return payload
    .filter(
      (job) =>
        job.id && job.position && job.company && job.url && job.date,
    )
    .map((job) => ({
      title: job.position.trim(),
      company: job.company.trim(),
      link: job.url,
      source: "RemoteOK",
      found_at: job.date,
      searchableText: [
        job.position,
        job.company,
        ...(Array.isArray(job.tags) ? job.tags : []),
        job.description,
        job.location,
      ]
        .filter(Boolean)
        .join(" "),
    }));
}
