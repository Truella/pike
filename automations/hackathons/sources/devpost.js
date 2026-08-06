/**
 * Fetches hackathons from Devpost and parses them into a standardized format.
 */
export async function fetchDevpostHackathons() {
  const endpoint = "https://devpost.com/api/hackathons";
  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`Devpost request failed (${response.status})`);
  }

  const data = await response.json();

  if (!data || !Array.isArray(data.hackathons)) {
    throw new Error("Devpost API returned unexpected response shape");
  }

  return data.hackathons.map((h) => {
    // Clean prize: remove HTML tags and normalize whitespace
    const rawPrize = h.prize_amount || "";
    const cleanPrize = rawPrize.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

    // Parse deadline from submission_period_dates (e.g., "Jul 27 - Sep 07, 2026")
    let deadline = null;
    if (h.submission_period_dates) {
      const dates = h.submission_period_dates.split(" - ");
      const endDateStr = dates[1] || dates[0];
      if (endDateStr) {
        const parsedDate = new Date(endDateStr.trim());
        if (!isNaN(parsedDate.getTime())) {
          deadline = parsedDate.toISOString();
        }
      }
    }

    return {
      name: h.title ? h.title.trim() : "Untitled Hackathon",
      organizer: h.organization_name ? h.organization_name.trim() : "Unknown Organizer",
      link: h.url,
      prize: cleanPrize || "$0",
      deadline: deadline,
    };
  });
}
