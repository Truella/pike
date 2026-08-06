// TODO: replace with real posts before production
export const styleExamples = [
  `Shipped the study module for Pike today.

The idea was simple: instead of juggling tabs between a GitHub study guide and a Notion tracker, I wanted one place that tells me exactly where I am and repeats the current topic until I mark it done.

Built it with Next.js + Supabase. A daily GitHub Action checks progress and pings me on Telegram if I'm stuck on the same topic for more than a day.

No streaks, no gamification. Just accountability.

#buildinpublic #nextjs`,

  `Spent the morning debugging a Supabase RLS policy that was silently dropping rows.

The policy looked correct. The logs showed the insert succeeded. But the data just... wasn't there.

Turned out: my service-role automation was bypassing RLS fine, but the dashboard was using the anon client for a read that required auth. Fixed it in 10 minutes once I knew where to look.

The lesson: always verify which client is making which request. They are not interchangeable.`,

  `Finished the hackathons tracker module for Pike.

It scrapes Devpost weekly, filters by prize pool and deadline, and flags anything urgent in red. No more finding out about a $50k hackathon the day submissions close.

The whole thing runs for $0 on GitHub Actions + Supabase free tier.

#devtools #buildingpublicly`,

  `Reviewed 12 job listings today. Applied to 3.

The other 9 were "remote" in the title and "must be in [specific city]" in the requirements. I've started building a filter for this.

If you're job hunting right now: protect your energy. Not every rejection is about you.`,

  `Hot take: the best thing you can do for your job search is keep building.

Not because hiring managers love side projects. Because building keeps your skills sharp, gives you something real to talk about, and prevents the mental spiral that comes from pure waiting.

Apply in the morning. Build in the afternoon. Rest in the evening. Repeat.`,
];
