# AI in Education source candidates

Verified on **2026-08-18**. This registry separates a URL that exists from a feed that is actually usable: every non-null `feedUrl` below was fetched in this run and its body began with RSS, Atom `<feed>`, or JSON. `403` means this research client received a CDN/access-denial page, not that the organisation or page is necessarily gone.

## Operating notes

- Prefer the rows with a verified RSS/Atom feed for automated intake. Most are broad feeds; apply an AI-and-education keyword/classifier stage before editorial review.
- Do not copy feed text into the site. Several feeds embed full HTML, but that is not a reuse licence. Publish a short original summary with attribution and a canonical link.
- The ScienceDirect row is intentionally retained as a research-discovery lead, but **must not be polled automatically**: its RSS host's `robots.txt` says `Disallow: /`.
- EdWeek's valid feed contained two dates in September 2026 even though verification was 2026-08-18. Treat feed timestamps as anomalous until independently rechecked.

## Summary table

| Source | Category | Verified feed | Observed cadence / status | Last verified |
|---|---|---|---|---|
| OpenAI Education / News | vendor-education | RSS | several items per weekday; broad feed | 200 / 200 XML |
| Google for Education / Google blog | vendor-education | none | HTML listing; feed candidate was HTML/404 | 200 / 404 |
| Anthropic Education / News | vendor-education | none | HTML news listing | 200 / 404 |
| Microsoft Education Blog | vendor-education | RSS | about weekly to several per month | 200 / 200 XML |
| UNESCO AI and education | policy | none | access-denied to this client | 403 |
| OECD AI and education | policy | none | access-denied to this client | 403 |
| European Commission AI Act | policy | none | policy page, irregular | 200 |
| European Commission Digital Education Action Plan | policy | none | policy page, irregular | 200 |
| US Department of Education AI report | policy | none | historical guidance document | PDF 200 |
| UK Department for Education AI search | policy | Atom | several relevant updates per week | 200 / 200 Atom |
| Taiwan Ministry of Education news | policy | none | HTML announcement list | 200 |
| Taiwan Ministry of Digital Affairs AI policy | policy | none | HTML policy/news pages | 200 |
| arXiv cs.CY | research | RSS | daily on submission days | 200 / 200 RSS |
| arXiv cs.HC | research | RSS | daily on submission days | 200 / 200 RSS |
| EdSurge | edtech-news | RSS | several items per week | 200 / 200 XML |
| Education Week | edtech-news | RSS | high frequency; future-dated entries observed | 200 / 200 XML |
| Inside Higher Ed | edtech-news | RSS | many items on publishing days | 200 / 200 RSS |
| Times Higher Education | edtech-news | none | HTML homepage 200; RSS candidate CDN-denied | 200 / 403 |
| THE Campus | practitioner | none | HTML homepage 200; RSS candidate invalid | 200 / 404 |
| Hugging Face Blog | practitioner | RSS | near-daily broad technical feed | 200 / 200 RSS |
| DeepLearning.AI The Batch | practitioner | none | weekly newsletter; no valid feed found | 200 / 404,500 candidates |
| Stanford HAI news | research | none | HTML news listing | 200 / HTML at RSS candidate |
| MIT Teaching Systems Lab | research | RSS | stale: latest ten are 2021 | 200 / 200 RSS |
| MIT News: Education | research | RSS | roughly several per month | 200 / 200 RSS |
| arXiv filtered AI + education query † | research | Atom | daily/near-daily query results | 200 / 200 Atom |
| Computers & Education: AI † | research | RSS | issue-driven; robots prohibit polling | 403 page / 200 RSS |
| Digital Promise † | practitioner | RSS | several items per week | 200 / 200 RSS |
| TeachAI † | practitioner | none | HTML resources/news; irregular | 200 |
| Khan Academy Blog † | vendor-education | RSS | several items per week | 200 / 200 RSS |
| AI4K12 † | practitioner | RSS | sparse, roughly monthly/quarterly | 200 / 200 RSS |
| PanSci 泛科學 † | taiwan-local | RSS | several items per week, broad feed | 200 / 200 RSS |
| 1EdTech Consortium † | practitioner | none | HTML/news listing | 200 / 404 candidate |

† Additional source not explicitly requested.

## Per-source details

### OpenAI Education / OpenAI News

- **name:** OpenAI Education / OpenAI News
- **homepage:** <https://academy.openai.com/> (200); education landing-page candidate <https://openai.com/education/> returned 403 to this client.
- **feedUrl:** <https://openai.com/news/rss.xml>
- **feedFormat:** rss — 200 `text/xml`; body begins `<rss>`.
- **category / language / region:** vendor-education / en / GLOBAL
- **updateCadence:** Several broad-news items per weekday: the first ten item dates span 2026-08-10 to 2026-08-17.
- **licenseNote:** `https://openai.com/robots.txt` returned 200 and allows `/`; feed contains `content:encoded` HTML. No reuse licence was inferred; use link and original digest copy only.
- **whyItMatters:** Official product, policy, Academy, ChatGPT Edu, and education-program announcements often first appear in this broad feed.
- **lastVerified:** 2026-08-18 — Academy 200; education page 403; RSS 200 XML.

### Google for Education / Google Blog Learning & Education

- **name:** Google for Education / Google Blog — Learning & Education
- **homepage:** <https://edu.google.com/> (200) and <https://blog.google/products-and-platforms/products/education/> (200).
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** vendor-education / en / GLOBAL
- **updateCadence:** No valid category feed to measure; poll the HTML listing weekly (selector: `main a[href*="/products-and-platforms/products/education/"]`) and the verified sitemap at <https://blog.google/sitemap.xml>.
- **licenseNote:** `https://blog.google/robots.txt` returned 200 and lists the sitemap; it disallows search URLs, not the listing path. Tested `/feed` returned HTML and the former Blogger-style AI feed candidate returned 404, so neither is a usable feed.
- **whyItMatters:** This is Google's official stream for Gemini for Education, Classroom AI, Workspace for Education, and educator AI-literacy programmes.
- **lastVerified:** 2026-08-18 — both home/listing pages 200; attempted feed endpoints 200 HTML and 404 HTML.

### Anthropic Education / Anthropic News

- **name:** Claude for Education / Anthropic News
- **homepage:** <https://claude.com/solutions/education> (200 after redirect from `anthropic.com/education`) and <https://www.anthropic.com/news> (200).
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** vendor-education / en / GLOBAL
- **updateCadence:** No feed to measure; poll `main a[href^="/news/"]` from the news listing weekly and compare canonical article URLs.
- **licenseNote:** `https://www.anthropic.com/robots.txt` returned 200 and says `Allow: /`; tested `/rss.xml` returned 404. No content-reuse permission inferred.
- **whyItMatters:** Tracks Claude for Education availability, university partnerships, and Anthropic's policy/safety guidance relevant to campus use.
- **lastVerified:** 2026-08-18 — education 200, news 200, RSS candidate 404.

### Microsoft Education Blog

- **name:** Microsoft Education Blog
- **homepage:** <https://www.microsoft.com/en-us/education/blog/> (200)
- **feedUrl:** <https://www.microsoft.com/en-us/education/blog/feed/>
- **feedFormat:** rss — 200 `application/rss+xml`; body begins `<rss>`.
- **category / language / region:** vendor-education / en / GLOBAL
- **updateCadence:** About weekly to several per month; the latest ten run from 2026-04-07 to 2026-07-28.
- **licenseNote:** Microsoft `robots.txt` returned 200; this WordPress feed includes `content:encoded` HTML. Treat it as an alert and link to the canonical article.
- **whyItMatters:** Official source for Copilot, Microsoft 365 Education, educator training, and school AI-governance releases.
- **lastVerified:** 2026-08-18 — homepage 200; RSS 200 XML.

### UNESCO AI and education

- **name:** UNESCO — Artificial intelligence in education
- **homepage:** <https://www.unesco.org/en/artificial-intelligence/education>
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** policy / en / GLOBAL
- **updateCadence:** UNVERIFIED: the page returned a 403 WAF response, so recent publication dates could not be measured. Retry from an approved browser/client; otherwise poll the page and UNESCO sitemap only after permissions review.
- **licenseNote:** `https://www.unesco.org/robots.txt` returned 200 and carries content-signal conditions; do not scrape this source on the basis of this registry.
- **whyItMatters:** UNESCO is a primary global source for AI-in-education recommendations, competency frameworks, and government guidance.
- **lastVerified:** 2026-08-18 — page 403 HTML; robots.txt 200.

### OECD AI and education

- **name:** OECD — AI and education
- **homepage:** <https://www.oecd.org/en/topics/sub-issues/ai-and-education.html>
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** policy / en / GLOBAL
- **updateCadence:** UNVERIFIED: homepage and RSS candidate both returned Cloudflare 403, preventing a date sample. Use an approved access path and the official topic page; do not infer a feed from the 403 response.
- **licenseNote:** `https://www.oecd.org/robots.txt` returned 200 and disallows `/content/dam/oecd/`; no blanket reuse licence inferred.
- **whyItMatters:** OECD provides cross-country evidence and policy analysis on AI, skills, assessment, and education systems.
- **lastVerified:** 2026-08-18 — homepage 403; `/en/rss.xml` 403; robots.txt 200.

### European Commission — AI Act

- **name:** European Commission — Regulatory framework for AI (AI Act)
- **homepage:** <https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai> (200)
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** policy / en / EU
- **updateCadence:** Policy page rather than dated feed; poll weekly via the page's `main` links or <https://digital-strategy.ec.europa.eu/en/sitemap.xml> if available.
- **licenseNote:** `https://digital-strategy.ec.europa.eu/robots.txt` returned 200; it must be reviewed before any crawler deployment. The fetched page has no feed declaration.
- **whyItMatters:** The AI Act determines risk, literacy, and governance obligations that affect education providers and edtech deployed in the EU.
- **lastVerified:** 2026-08-18 — homepage 200 HTML; robots.txt 200.

### European Commission — Digital Education Action Plan

- **name:** European Commission — Digital Education Action Plan
- **homepage:** <https://education.ec.europa.eu/focus-topics/digital-education/actions/plan> (200 after redirect)
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** policy / en / EU
- **updateCadence:** Policy programme page; no feed, so measure changes from HTML/sitemap diffs rather than inventing a cadence.
- **licenseNote:** `https://education.ec.europa.eu/robots.txt` returned 200; no feed or reuse licence was observed in the fetched response.
- **whyItMatters:** Connects European digital-education policy with AI skills, teacher capacity, and school-system implementation.
- **lastVerified:** 2026-08-18 — homepage 200 HTML; robots.txt 200.

### US Department of Education AI guidance

- **name:** U.S. Department of Education — Artificial Intelligence and the Future of Teaching and Learning
- **homepage:** <https://www2.ed.gov/documents/ai-report/ai-report.pdf>
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** policy / en / US
- **updateCadence:** Historical guidance PDF, not a news feed. Poll the Department's AI/edtech policy and newsroom pages manually; tested `/ai` and `/about/initiatives/ai` returned 404, so they are not registry URLs.
- **licenseNote:** PDF was fetched successfully; no feed/reuse statement was extracted. `www2.ed.gov/robots.txt` redirected to a 404 path, so crawler permission is UNVERIFIED.
- **whyItMatters:** It remains a primary federal framing of educational AI opportunities, risks, equity, and human oversight.
- **lastVerified:** 2026-08-18 — PDF 200; tested AI landing candidates 404.

### UK Department for Education AI search

- **name:** GOV.UK — Department for Education AI search
- **homepage:** <https://www.gov.uk/government/organisations/department-for-education> (200)
- **feedUrl:** <https://www.gov.uk/search/all.atom?organisations%5B%5D=department-for-education&keywords=artificial%20intelligence&order=updated-newest>
- **feedFormat:** atom — 200 `application/atom+xml`; body begins `<feed>`.
- **category / language / region:** policy / en / UK
- **updateCadence:** Several matching updates per week; the latest ten entries span 2026-07-16 to 2026-08-17.
- **licenseNote:** GOV.UK robots.txt is 200 and explicitly disallows `/search/all*`; **do not poll this Atom URL automatically without confirming permission**, even though it is a valid feed. It is summary/metadata-oriented.
- **whyItMatters:** Provides first-party DfE guidance, consultations, and school-policy updates filtered to AI.
- **lastVerified:** 2026-08-18 — organisation page 200; Atom 200; robots.txt 200.

### Taiwan Ministry of Education news

- **name:** 教育部全球資訊網 — 即時新聞 / Ministry of Education, Taiwan
- **homepage:** <https://www.edu.tw/News.aspx?n=BA5E856472F10901&sms=461F4DA9139BDF30> (200)
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** policy / zh-tw / TW
- **updateCadence:** No exposed valid RSS was found (`/rss` returned 404); poll the news-listing page weekly, extracting announcement links under the listing, then filter `人工智慧|AI|生成式|數位學習`.
- **licenseNote:** `https://www.edu.tw/robots.txt` returned 200 and does not disallow the news listing. No reuse licence inferred; use headline/link/short original summary.
- **whyItMatters:** Primary Taiwanese source for school and higher-education AI policy, grants, teacher development, and official announcements.
- **lastVerified:** 2026-08-18 — homepage/listing 200; RSS candidate 404; robots.txt 200.

### Taiwan Ministry of Digital Affairs AI policy

- **name:** 數位發展部 — 人工智慧 / Ministry of Digital Affairs, Taiwan
- **homepage:** <https://moda.gov.tw/major-policies/ai/1781.html> (200)
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** policy / zh-tw / TW
- **updateCadence:** No RSS endpoint found; poll the AI policy page plus linked press/news pages weekly, then retain education, literacy, talent, and school-relevant changes.
- **licenseNote:** `/robots.txt` returned 404 (no robots policy exposed at that conventional path); copyright/reuse status is therefore UNVERIFIED and should be checked before automation.
- **whyItMatters:** Captures Taiwan's national AI policy, talent and digital-infrastructure initiatives that shape education programmes.
- **lastVerified:** 2026-08-18 — homepage 200 HTML; `/press/` 404; robots candidate 404.

### arXiv cs.CY

- **name:** arXiv — Computers and Society (cs.CY)
- **homepage:** <https://arxiv.org/list/cs.CY/recent> (not separately fetched; feed below is the verified machine endpoint)
- **feedUrl:** <https://export.arxiv.org/rss/cs.CY>
- **feedFormat:** rss — 200 `application/rss+xml`; body begins `<rss>`.
- **category / language / region:** research / en / GLOBAL
- **updateCadence:** Daily on submission days; all sampled current entries were dated 2026-08-18.
- **licenseNote:** Feed includes abstracts, not licence grants; check each paper's arXiv licence. Feed is appropriate for metadata discovery, then filter `education|school|student|teacher|learning`.
- **whyItMatters:** Finds societal, governance, equity, and education-adjacent AI research early.
- **lastVerified:** 2026-08-18 — RSS 200 XML.

### arXiv cs.HC

- **name:** arXiv — Human-Computer Interaction (cs.HC)
- **homepage:** <https://arxiv.org/list/cs.HC/recent> (not separately fetched; feed below is the verified machine endpoint)
- **feedUrl:** <https://export.arxiv.org/rss/cs.HC>
- **feedFormat:** rss — 200 `application/rss+xml`; body begins `<rss>`.
- **category / language / region:** research / en / GLOBAL
- **updateCadence:** Daily on submission days; all sampled current entries were dated 2026-08-18.
- **licenseNote:** Abstract/metadata discovery only; licensing varies by paper and must be checked per record.
- **whyItMatters:** Surfaces learner, teacher, accessibility, interface, and human-AI interaction studies before journal publication.
- **lastVerified:** 2026-08-18 — RSS 200 XML.

### EdSurge

- **name:** EdSurge
- **homepage:** <https://www.edsurge.com/> (200)
- **feedUrl:** <https://www.edsurge.com/articles_rss>
- **feedFormat:** rss — 200 XML; body begins `<rss>`.
- **category / language / region:** edtech-news / en / US
- **updateCadence:** Several articles per week; latest ten span 2026-08-03 to 2026-08-17.
- **licenseNote:** robots.txt is 200 and allows the public paths while disallowing `/api/`; feed has descriptions/content markup but no reuse licence. Summary/link only.
- **whyItMatters:** One of the most consistently education-specific newsrooms for AI classroom, district, and edtech coverage.
- **lastVerified:** 2026-08-18 — homepage 200; RSS 200 XML; robots.txt 200.

### Education Week

- **name:** Education Week
- **homepage:** <https://www.edweek.org/feed> (200 feed-directory page)
- **feedUrl:** <https://www.edweek.org/feed.rss>
- **feedFormat:** rss — 200 XML; body begins `<rss>`.
- **category / language / region:** edtech-news / en / US
- **updateCadence:** High-frequency, but date integrity is suspect: sampled entries include 2026-08-17/18 and two future dates (2026-09-21 and 2026-09-29). Recheck timestamps before publishing recency claims.
- **licenseNote:** robots.txt is 200, sets `Crawl-delay: 10`, and disallows `/search`; feed contains snippets, not a reuse licence. Respect rate limits.
- **whyItMatters:** Essential U.S. K-12 reporting on classroom AI, district procurement, teachers, and state policy.
- **lastVerified:** 2026-08-18 — directory 200; RSS 200 XML; robots.txt 200.

### Inside Higher Ed

- **name:** Inside Higher Ed
- **homepage:** <https://www.insidehighered.com/> (not separately fetched; verified RSS below)
- **feedUrl:** <https://www.insidehighered.com/rss.xml>
- **feedFormat:** rss — 200 `application/rss+xml`; body begins `<rss>`.
- **category / language / region:** edtech-news / en / US
- **updateCadence:** Many items on publishing days; the sampled feed has numerous entries dated 2026-08-17.
- **licenseNote:** robots.txt is 200 and includes machine-readable content-signal conditions; treat feed as headlines/abstracts and do not republish article text.
- **whyItMatters:** Strong higher-education lens for campus AI policy, teaching, assessment, student use, and institutional operations.
- **lastVerified:** 2026-08-18 — RSS 200 XML; robots.txt 200.

### Times Higher Education

- **name:** Times Higher Education
- **homepage:** <https://www.timeshighereducation.com/> (200)
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** edtech-news / en / UK
- **updateCadence:** No usable RSS, and a ten-item HTML date sample was not taken. The homepage is machine-fetchable; poll its article-card HTML weekly only after a terms review.
- **licenseNote:** robots.txt returned 200. RSS candidate was CDN-denied (403); no reuse licence was inferred and articles may be paywalled.
- **whyItMatters:** Major global higher-education outlet with significant coverage of university AI policy and implementation.
- **lastVerified:** 2026-08-18 — homepage 200 HTML; RSS candidate 403 HTML; robots.txt 200.

### THE Campus

- **name:** THE Campus
- **homepage:** <https://www.timeshighereducation.com/campus> (200)
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** practitioner / en / GLOBAL
- **updateCadence:** No valid RSS, and a ten-item HTML date sample was not taken. The Campus HTML is machine-fetchable; if permission permits, poll article cards weekly.
- **licenseNote:** Uses the same parent-domain robots policy as Times Higher Education; no reuse licence inferred and some content may require a subscription.
- **whyItMatters:** Practitioner-focused university teaching and learning guidance often gives more actionable context than breaking news.
- **lastVerified:** 2026-08-18 — Campus homepage 200 HTML; RSS candidate 404 HTML; parent RSS probe 403; robots.txt 200.

### Hugging Face Blog

- **name:** Hugging Face Blog
- **homepage:** <https://huggingface.co/blog> (implicit in verified feed)
- **feedUrl:** <https://huggingface.co/blog/feed.xml>
- **feedFormat:** rss — 200 `application/rss+xml`; body begins `<rss>`.
- **category / language / region:** practitioner / en / GLOBAL
- **updateCadence:** Near-daily broad ML/AI posts; latest ten span 2026-08-06 to 2026-08-17.
- **licenseNote:** robots.txt is 200 and allows `/`; feed is largely metadata/summary. Individual repositories, models, and posts carry their own licences.
- **whyItMatters:** Useful for open models, datasets, course tooling, and reproducible AI-literacy resources that educators may adopt.
- **lastVerified:** 2026-08-18 — RSS 200 XML; robots.txt 200.

### DeepLearning.AI — The Batch

- **name:** The Batch — DeepLearning.AI
- **homepage:** <https://www.deeplearning.ai/the-batch> (200)
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** practitioner / en / GLOBAL
- **updateCadence:** Weekly newsletter by its own description; no valid feed was found (`/the-batch/feed/` and `/rss/` 404, `feed.xml` 500). Poll the issue-card HTML weekly if terms permit.
- **licenseNote:** robots.txt is 200 and allows `/`; no feed/reuse permission was established from the fetched page.
- **whyItMatters:** High-signal AI context and explainers help editors connect technical changes to classroom relevance.
- **lastVerified:** 2026-08-18 — homepage 200; tested feed candidates 404/500; robots.txt 200.

### Stanford HAI News

- **name:** Stanford Institute for Human-Centered Artificial Intelligence — News
- **homepage:** <https://hai.stanford.edu/news> (200)
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** research / en / US
- **updateCadence:** No valid feed: `/news/rss.xml` returned 200 HTML, not XML. Poll `main a[href*="/news/"]` or the sitemap weekly.
- **licenseNote:** robots.txt is 200, allows public paths, and disallows `/cms/`, `/api/`, `/cp/`; no reuse licence inferred.
- **whyItMatters:** Brings rigorous research and policy context on responsible AI, including education, labour, and societal impacts.
- **lastVerified:** 2026-08-18 — news listing 200; RSS-looking URL 200 HTML; robots.txt 200.

### MIT Teaching Systems Lab

- **name:** MIT Teaching Systems Lab
- **homepage:** <https://tsl.mit.edu/about-new/> (200)
- **feedUrl:** <https://tsl.mit.edu/feed/>
- **feedFormat:** rss — 200 `application/rss+xml`; body begins `<rss>`.
- **category / language / region:** research / en / US
- **updateCadence:** **Not suitable for weekly monitoring:** the latest ten feed items are dated 2020-03 through 2021-01. Keep as an archival/occasional source only.
- **licenseNote:** robots.txt is 200, sets `Crawl-delay: 10`, and has no general disallow; feed has content markup but no blanket reuse grant.
- **whyItMatters:** Still valuable for research-informed teacher learning and educational technology, but its feed is dormant.
- **lastVerified:** 2026-08-18 — homepage 200; RSS 200 XML; robots.txt 200.

### MIT News — Education

- **name:** MIT News — Education topic
- **homepage:** <https://news.mit.edu/topic/education> (topic inferred from verified RSS endpoint)
- **feedUrl:** <https://news.mit.edu/rss/topic/education>
- **feedFormat:** rss — 200 `application/rss+xml`; body begins `<rss>`.
- **category / language / region:** research / en / US
- **updateCadence:** Several items per month; latest ten span 2026-06-17 to 2026-08-11.
- **licenseNote:** robots.txt returned 200; the feed supplies article excerpts/content markup but no broad reuse permission.
- **whyItMatters:** Tracks research, learning science, campus deployments, and MIT-originated education innovation with institutional attribution.
- **lastVerified:** 2026-08-18 — RSS 200 XML; robots.txt 200.

### arXiv filtered AI + education query †

- **name:** arXiv API — artificial intelligence AND education
- **homepage:** <https://export.arxiv.org/api/query?search_query=all:%22artificial%20intelligence%22%20AND%20all:education&start=0&max_results=100&sortBy=submittedDate&sortOrder=descending>
- **feedUrl:** <https://export.arxiv.org/api/query?search_query=all:%22artificial%20intelligence%22%20AND%20all:education&start=0&max_results=100&sortBy=submittedDate&sortOrder=descending>
- **feedFormat:** atom — 200 `application/atom+xml`; body begins `<feed>`.
- **category / language / region:** research / en / GLOBAL
- **updateCadence:** Daily/near-daily results; sampled updates run 2026-08-13 to 2026-08-18.
- **licenseNote:** Metadata/abstract discovery endpoint; check each paper's licence before reuse. Query is reproducible but will return false positives, so editorial screening remains necessary.
- **whyItMatters:** A directly machine-filterable research queue is more useful for a weekly AI-education desk than two broad arXiv categories alone.
- **lastVerified:** 2026-08-18 — Atom 200 XML.

### Computers & Education: Artificial Intelligence †

- **name:** Computers & Education: Artificial Intelligence
- **homepage:** <https://www.sciencedirect.com/journal/computers-and-education-artificial-intelligence>
- **feedUrl:** <https://rss.sciencedirect.com/publication/science/2666920X>
- **feedFormat:** rss — 200 `application/rss+xml`; body begins `<rss>`.
- **category / language / region:** research / en / GLOBAL
- **updateCadence:** Issue-driven; date extraction from the current feed was not reliable enough to claim a last-ten cadence.
- **licenseNote:** **Do not automate.** `https://rss.sciencedirect.com/robots.txt` returned 200 with `Disallow: /`; the journal homepage itself returned 403 in this client and articles may be paywalled. Use permitted alerts/official APIs instead.
- **whyItMatters:** A directly relevant peer-reviewed AI-in-education journal, useful as a human-reviewed research watchlist rather than an automated collector.
- **lastVerified:** 2026-08-18 — journal page 403; RSS 200 XML; RSS robots.txt 200 disallow-all.

### Digital Promise †

- **name:** Digital Promise
- **homepage:** <https://digitalpromise.org/> (implicit in verified feed)
- **feedUrl:** <https://digitalpromise.org/feed/>
- **feedFormat:** rss — 200 `application/rss+xml`; body begins `<rss>`.
- **category / language / region:** practitioner / en / US
- **updateCadence:** Several posts per week; latest ten span 2026-06-29 to 2026-08-17.
- **licenseNote:** robots.txt returned 200 with an empty body; no explicit crawl restriction was found, but no reuse licence is implied. Feed includes WordPress content markup.
- **whyItMatters:** Nonprofit implementation research and district-facing AI resources add practical, equity-aware context.
- **lastVerified:** 2026-08-18 — RSS 200 XML; robots.txt 200 empty.

### TeachAI †

- **name:** TeachAI
- **homepage:** <https://www.teachai.org/> (200)
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** practitioner / en / US
- **updateCadence:** No feed exposed; poll new resource/news cards weekly from HTML or the sitemap at <https://www.teachai.org/sitemap.xml>.
- **licenseNote:** robots.txt is 200 and allows `/` while disallowing `/api_v2/`, `/embedded/`, `/saml/`; no reuse licence inferred.
- **whyItMatters:** Curates school-ready AI guidance and policy resources with a teacher and district focus.
- **lastVerified:** 2026-08-18 — homepage 200; robots.txt 200.

### Khan Academy Blog †

- **name:** Khan Academy Blog
- **homepage:** <https://blog.khanacademy.org/> (200)
- **feedUrl:** <https://blog.khanacademy.org/feed/>
- **feedFormat:** rss — 200 `application/rss+xml`; body begins `<rss>`.
- **category / language / region:** vendor-education / en / GLOBAL
- **updateCadence:** Several posts per week; latest ten span 2026-07-20 to 2026-08-17.
- **licenseNote:** robots.txt is 200, specifies `Crawl-delay: 10`, and contains no blanket disallow; the WordPress feed has content markup but articles are not automatically reusable.
- **whyItMatters:** Tracks Khanmigo and a major education provider's AI product, pedagogy, and access announcements.
- **lastVerified:** 2026-08-18 — homepage 200; RSS 200 XML; robots.txt 200.

### AI4K12 †

- **name:** AI4K12 Initiative
- **homepage:** <https://ai4k12.org/> (200)
- **feedUrl:** <https://ai4k12.org/feed/>
- **feedFormat:** rss — 200 `application/rss+xml`; body begins `<rss>`.
- **category / language / region:** practitioner / en / US
- **updateCadence:** Sparse: latest ten posts run from 2025-02-27 to 2026-02-18, roughly monthly/quarterly rather than weekly.
- **licenseNote:** robots.txt is 200 and disallows `/wp-admin/` but permits `admin-ajax`; use feed metadata and check resource-specific licences.
- **whyItMatters:** A credible K-12 AI-literacy framework source, especially for standards and teacher-facing curricular materials.
- **lastVerified:** 2026-08-18 — homepage 200; RSS 200 XML; robots.txt 200.

### PanSci 泛科學 †

- **name:** PanSci 泛科學
- **homepage:** <https://pansci.asia/> (200)
- **feedUrl:** <https://pansci.asia/feed>
- **feedFormat:** rss — 200 `application/rss+xml`; body begins `<rss>`.
- **category / language / region:** taiwan-local / zh-tw / TW
- **updateCadence:** Several broad science articles per week; latest ten span 2026-07-29 to 2026-08-18. Filter for AI, education, learning, schools, and literacy.
- **licenseNote:** robots.txt is 200 and allows `/`; feed includes WordPress content markup. Copyright remains with PanSci/authors unless an article says otherwise.
- **whyItMatters:** Adds Taiwanese Chinese-language science communication and local context that official policy sources do not supply.
- **lastVerified:** 2026-08-18 — homepage 200; RSS 200 XML; robots.txt 200.

### 1EdTech Consortium †

- **name:** 1EdTech Consortium
- **homepage:** <https://www.1edtech.org/> (200)
- **feedUrl:** null
- **feedFormat:** none
- **category / language / region:** practitioner / en / GLOBAL
- **updateCadence:** No valid RSS found (`/rss.xml` 404); poll the site's news/article cards and sitemap after respecting robots.
- **licenseNote:** robots.txt returned 200; no feed/reuse licence was observed. Standards documents may carry separate licences/terms.
- **whyItMatters:** Important for AI interoperability, learner data, credentialing, and technical standards that shape deployable edtech.
- **lastVerified:** 2026-08-18 — homepage 200; RSS candidate 404; robots.txt 200.

## No usable feed / scraping and access-risk register

| Source | Polling alternative | Restriction or risk |
|---|---|---|
| Google for Education | HTML education listing + `blog.google/sitemap.xml` | robots permits listing but disallows search URLs; feed candidates invalid. |
| Anthropic | HTML news cards + sitemap | robots says allow; no RSS endpoint found. |
| UNESCO | Approved browser/client, then official page/sitemap | This client got 403; robots has content-signal conditions. Do not deploy a scraper from this result. |
| OECD | Approved browser/client, then topic page | This client got 403; robots disallows `/content/dam/oecd/`. |
| EU AI Act / Digital Education Plan | Policy-page and sitemap diffs | robots must be respected; no feed declared. |
| US Department of Education | Official newsroom/edtech page when a live landing is identified | The known AI report is a static PDF; tested `/ai` paths are dead (404). |
| Taiwan MOE | News-list HTML | robots allows this path; no RSS found. |
| Taiwan MODA | AI policy and linked press/news cards | No conventional robots.txt exposed (404); permission status is unverified. |
| Times Higher Education / THE Campus | HTML article cards after terms review | Homepages returned 200; RSS probe was 403/404, and subscription/reuse terms were not fetched. |
| DeepLearning.AI The Batch | HTML issue cards / newsletter delivery | no valid RSS found; robots allows public paths. |
| Stanford HAI / TeachAI / 1EdTech | HTML listings plus sitemap | no valid RSS found; robots gives source-specific limits. |
| Computers & Education: AI | Official alerts or licensed API | RSS XML is technically valid but robots.txt says `Disallow: /`; automated use is prohibited. |

## Dead, moved, paywalled, or anomalous endpoints

- **Moved:** `https://www.anthropic.com/education` redirected to `https://claude.com/solutions/education`; Microsoft Learn's tested older AI-learning path redirected to a new learning path.
- **Dead/invalid feed candidates:** Google `edu.google.com/rss.xml` (404), Anthropic `/rss.xml` (404), US Department of Education `/ai` and `/about/initiatives/ai` (404), DeepLearning.AI Batch `/feed/` and `/rss/` (404), 1EdTech `/rss.xml` (404), and THE Campus `/campus/rss.xml` (404).
- **Access/paywall caution:** Times Higher Education RSS returned 403; the ScienceDirect journal page returned 403 and may be paywalled; UNESCO and OECD returned access-denial pages in this environment.
- **Data-quality caution:** Education Week RSS returned valid XML but included future-dated items relative to the verification date; MIT Teaching Systems Lab RSS is valid but dormant.

## Ready-to-use JSON

```json
[
  {"name":"OpenAI Education / OpenAI News","homepage":"https://academy.openai.com/","feedUrl":"https://openai.com/news/rss.xml","feedFormat":"rss","category":"vendor-education","language":"en","region":"GLOBAL","updateCadence":"Several broad-news items per weekday; sampled 2026-08-10 to 2026-08-17.","licenseNote":"robots.txt 200 allows /; feed has content:encoded HTML. No reuse licence inferred; link and summarize.","whyItMatters":"Official source for OpenAI education, Academy, product and policy announcements.","lastVerified":"2026-08-18; Academy 200, education landing 403, RSS 200 XML"},
  {"name":"Google for Education / Google Blog — Learning & Education","homepage":"https://blog.google/products-and-platforms/products/education/","feedUrl":null,"feedFormat":"none","category":"vendor-education","language":"en","region":"GLOBAL","updateCadence":"No valid category feed; poll HTML listing weekly.","licenseNote":"robots.txt 200 lists sitemap; tested feed endpoints were HTML/404. No reuse licence inferred.","whyItMatters":"Official Gemini for Education, Classroom AI and educator-program source.","lastVerified":"2026-08-18; education and listing 200, feed candidates 200 HTML/404"},
  {"name":"Claude for Education / Anthropic News","homepage":"https://claude.com/solutions/education","feedUrl":null,"feedFormat":"none","category":"vendor-education","language":"en","region":"GLOBAL","updateCadence":"No feed; poll Anthropic News HTML weekly.","licenseNote":"robots.txt 200 says Allow: /; /rss.xml was 404. No reuse licence inferred.","whyItMatters":"Tracks Claude for Education and university AI announcements.","lastVerified":"2026-08-18; education 200, news 200, RSS candidate 404"},
  {"name":"Microsoft Education Blog","homepage":"https://www.microsoft.com/en-us/education/blog/","feedUrl":"https://www.microsoft.com/en-us/education/blog/feed/","feedFormat":"rss","category":"vendor-education","language":"en","region":"GLOBAL","updateCadence":"About weekly to several per month; sampled 2026-04-07 to 2026-07-28.","licenseNote":"robots.txt 200; WordPress content markup is not a reuse licence.","whyItMatters":"Official Copilot, Microsoft 365 Education and educator-AI source.","lastVerified":"2026-08-18; homepage 200, RSS 200 XML"},
  {"name":"UNESCO — Artificial intelligence in education","homepage":"https://www.unesco.org/en/artificial-intelligence/education","feedUrl":null,"feedFormat":"none","category":"policy","language":"en","region":"GLOBAL","updateCadence":"UNVERIFIED: page returned 403, so no current date sample.","licenseNote":"robots.txt 200 has content-signal conditions; do not scrape without permission review.","whyItMatters":"Primary global guidance on AI-in-education policy and competencies.","lastVerified":"2026-08-18; homepage 403 HTML, robots.txt 200"},
  {"name":"OECD — AI and education","homepage":"https://www.oecd.org/en/topics/sub-issues/ai-and-education.html","feedUrl":null,"feedFormat":"none","category":"policy","language":"en","region":"GLOBAL","updateCadence":"UNVERIFIED: Cloudflare 403 blocked homepage and RSS candidate.","licenseNote":"robots.txt 200 disallows /content/dam/oecd/; no reuse licence inferred.","whyItMatters":"Cross-country evidence on AI, skills, assessment and education policy.","lastVerified":"2026-08-18; homepage 403, RSS candidate 403, robots.txt 200"},
  {"name":"European Commission — Regulatory framework for AI","homepage":"https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai","feedUrl":null,"feedFormat":"none","category":"policy","language":"en","region":"EU","updateCadence":"Policy page; no feed, poll HTML/sitemap changes weekly.","licenseNote":"robots.txt 200; no reuse licence or feed observed.","whyItMatters":"AI Act obligations affect education providers and edtech in the EU.","lastVerified":"2026-08-18; homepage 200 HTML, robots.txt 200"},
  {"name":"European Commission — Digital Education Action Plan","homepage":"https://education.ec.europa.eu/focus-topics/digital-education/actions/plan","feedUrl":null,"feedFormat":"none","category":"policy","language":"en","region":"EU","updateCadence":"Policy programme page; no feed, use HTML/sitemap diffs.","licenseNote":"robots.txt 200; no feed or reuse licence observed.","whyItMatters":"Links digital education implementation with AI skills and teacher capacity.","lastVerified":"2026-08-18; homepage 200 HTML, robots.txt 200"},
  {"name":"U.S. Department of Education — Artificial Intelligence and the Future of Teaching and Learning","homepage":"https://www2.ed.gov/documents/ai-report/ai-report.pdf","feedUrl":null,"feedFormat":"none","category":"policy","language":"en","region":"US","updateCadence":"Historical guidance PDF, not a news feed.","licenseNote":"PDF 200; crawler permission is UNVERIFIED because robots path returned 404 after redirect.","whyItMatters":"Primary federal framing of opportunities and risks in educational AI.","lastVerified":"2026-08-18; PDF 200, tested /ai landing candidates 404"},
  {"name":"GOV.UK — Department for Education AI search","homepage":"https://www.gov.uk/government/organisations/department-for-education","feedUrl":"https://www.gov.uk/search/all.atom?organisations%5B%5D=department-for-education&keywords=artificial%20intelligence&order=updated-newest","feedFormat":"atom","category":"policy","language":"en","region":"UK","updateCadence":"Several matching updates per week; sampled 2026-07-16 to 2026-08-17.","licenseNote":"robots.txt 200 disallows /search/all*; valid Atom feed must not be auto-polled without permission confirmation.","whyItMatters":"First-party DfE AI guidance, consultations and school-policy updates.","lastVerified":"2026-08-18; homepage 200, Atom 200 XML, robots.txt 200"},
  {"name":"教育部全球資訊網 — 即時新聞 / Ministry of Education, Taiwan","homepage":"https://www.edu.tw/News.aspx?n=BA5E856472F10901&sms=461F4DA9139BDF30","feedUrl":null,"feedFormat":"none","category":"policy","language":"zh-tw","region":"TW","updateCadence":"No valid RSS; poll news-list HTML weekly and filter AI terms.","licenseNote":"robots.txt 200 does not disallow this listing; no reuse licence inferred.","whyItMatters":"Primary Taiwan source for school and university AI policy and announcements.","lastVerified":"2026-08-18; listing 200, RSS candidate 404, robots.txt 200"},
  {"name":"數位發展部 — 人工智慧 / Ministry of Digital Affairs, Taiwan","homepage":"https://moda.gov.tw/major-policies/ai/1781.html","feedUrl":null,"feedFormat":"none","category":"policy","language":"zh-tw","region":"TW","updateCadence":"No RSS found; poll AI policy and linked press/news pages weekly.","licenseNote":"conventional robots.txt returned 404; crawl permission is UNVERIFIED.","whyItMatters":"National AI policy and talent/infrastructure context for Taiwan education.","lastVerified":"2026-08-18; homepage 200, press candidate 404, robots candidate 404"},
  {"name":"arXiv — Computers and Society (cs.CY)","homepage":"https://arxiv.org/list/cs.CY/recent","feedUrl":"https://export.arxiv.org/rss/cs.CY","feedFormat":"rss","category":"research","language":"en","region":"GLOBAL","updateCadence":"Daily on submission days; sampled items dated 2026-08-18.","licenseNote":"Abstract/metadata discovery only; check each paper licence.","whyItMatters":"Early AI-and-society research, including policy and education-adjacent work.","lastVerified":"2026-08-18; RSS 200 XML"},
  {"name":"arXiv — Human-Computer Interaction (cs.HC)","homepage":"https://arxiv.org/list/cs.HC/recent","feedUrl":"https://export.arxiv.org/rss/cs.HC","feedFormat":"rss","category":"research","language":"en","region":"GLOBAL","updateCadence":"Daily on submission days; sampled items dated 2026-08-18.","licenseNote":"Abstract/metadata discovery only; check each paper licence.","whyItMatters":"Early learner, teacher, accessibility and human-AI interaction research.","lastVerified":"2026-08-18; RSS 200 XML"},
  {"name":"EdSurge","homepage":"https://www.edsurge.com/","feedUrl":"https://www.edsurge.com/articles_rss","feedFormat":"rss","category":"edtech-news","language":"en","region":"US","updateCadence":"Several articles per week; sampled 2026-08-03 to 2026-08-17.","licenseNote":"robots.txt 200 allows public paths but disallows /api/; summary/link only.","whyItMatters":"Education-specific newsroom for AI classroom, district and edtech coverage.","lastVerified":"2026-08-18; homepage 200, RSS 200 XML, robots.txt 200"},
  {"name":"Education Week","homepage":"https://www.edweek.org/feed","feedUrl":"https://www.edweek.org/feed.rss","feedFormat":"rss","category":"edtech-news","language":"en","region":"US","updateCadence":"High-frequency, but sampled feed includes future dates; validate timestamps.","licenseNote":"robots.txt 200 sets Crawl-delay: 10 and disallows /search; summary/link only.","whyItMatters":"Essential U.S. K-12 AI, teacher, district and policy reporting.","lastVerified":"2026-08-18; directory 200, RSS 200 XML, robots.txt 200"},
  {"name":"Inside Higher Ed","homepage":"https://www.insidehighered.com/","feedUrl":"https://www.insidehighered.com/rss.xml","feedFormat":"rss","category":"edtech-news","language":"en","region":"US","updateCadence":"Many items on publishing days; sampled entries dated 2026-08-17.","licenseNote":"robots.txt 200 includes content-signal conditions; do not republish article text.","whyItMatters":"Campus AI policy, teaching, assessment and operations reporting.","lastVerified":"2026-08-18; RSS 200 XML, robots.txt 200"},
  {"name":"Times Higher Education","homepage":"https://www.timeshighereducation.com/","feedUrl":null,"feedFormat":"none","category":"edtech-news","language":"en","region":"UK","updateCadence":"No usable RSS and no ten-item HTML date sample; poll homepage cards weekly after terms review.","licenseNote":"robots.txt 200; RSS candidate 403. No reuse licence inferred and articles may be paywalled.","whyItMatters":"Major global higher-education AI news source.","lastVerified":"2026-08-18; homepage 200 HTML, RSS candidate 403 HTML, robots.txt 200"},
  {"name":"THE Campus","homepage":"https://www.timeshighereducation.com/campus","feedUrl":null,"feedFormat":"none","category":"practitioner","language":"en","region":"GLOBAL","updateCadence":"No valid RSS and no ten-item HTML date sample; poll article cards weekly after terms review.","licenseNote":"Parent-domain robots policy applies; possible subscription content.","whyItMatters":"Actionable university teaching-and-learning implementation guidance.","lastVerified":"2026-08-18; Campus homepage 200 HTML, RSS candidate 404 HTML, parent RSS 403, robots.txt 200"},
  {"name":"Hugging Face Blog","homepage":"https://huggingface.co/blog","feedUrl":"https://huggingface.co/blog/feed.xml","feedFormat":"rss","category":"practitioner","language":"en","region":"GLOBAL","updateCadence":"Near-daily broad technical posts; sampled 2026-08-06 to 2026-08-17.","licenseNote":"robots.txt 200 allows /; item licences vary.","whyItMatters":"Open model, dataset and AI-literacy tooling discovery for educators.","lastVerified":"2026-08-18; RSS 200 XML, robots.txt 200"},
  {"name":"The Batch — DeepLearning.AI","homepage":"https://www.deeplearning.ai/the-batch","feedUrl":null,"feedFormat":"none","category":"practitioner","language":"en","region":"GLOBAL","updateCadence":"Weekly newsletter; no valid feed found.","licenseNote":"robots.txt 200 allows /; feed candidates returned 404/500.","whyItMatters":"High-signal AI explainers help contextualise technical news for education editors.","lastVerified":"2026-08-18; homepage 200, feed candidates 404/500, robots.txt 200"},
  {"name":"Stanford HAI News","homepage":"https://hai.stanford.edu/news","feedUrl":null,"feedFormat":"none","category":"research","language":"en","region":"US","updateCadence":"No valid feed; poll HTML news cards or sitemap weekly.","licenseNote":"robots.txt 200 disallows /cms/, /api/, /cp/; no reuse licence inferred.","whyItMatters":"Rigorous responsible-AI research and policy context.","lastVerified":"2026-08-18; news 200, RSS-looking URL 200 HTML, robots.txt 200"},
  {"name":"MIT Teaching Systems Lab","homepage":"https://tsl.mit.edu/about-new/","feedUrl":"https://tsl.mit.edu/feed/","feedFormat":"rss","category":"research","language":"en","region":"US","updateCadence":"Dormant: latest ten are 2020-03 to 2021-01; not a weekly source.","licenseNote":"robots.txt 200 sets Crawl-delay: 10; no blanket reuse grant.","whyItMatters":"Research-informed teacher-learning source, best kept as archival watchlist.","lastVerified":"2026-08-18; homepage 200, RSS 200 XML, robots.txt 200"},
  {"name":"MIT News — Education topic","homepage":"https://news.mit.edu/topic/education","feedUrl":"https://news.mit.edu/rss/topic/education","feedFormat":"rss","category":"research","language":"en","region":"US","updateCadence":"Several per month; sampled 2026-06-17 to 2026-08-11.","licenseNote":"robots.txt 200; feed excerpts/content markup are not a reuse licence.","whyItMatters":"Institutional research and education innovation reporting.","lastVerified":"2026-08-18; RSS 200 XML, robots.txt 200"},
  {"name":"arXiv API — artificial intelligence AND education","homepage":"https://export.arxiv.org/api/query?search_query=all:%22artificial%20intelligence%22%20AND%20all:education&start=0&max_results=100&sortBy=submittedDate&sortOrder=descending","feedUrl":"https://export.arxiv.org/api/query?search_query=all:%22artificial%20intelligence%22%20AND%20all:education&start=0&max_results=100&sortBy=submittedDate&sortOrder=descending","feedFormat":"atom","category":"research","language":"en","region":"GLOBAL","updateCadence":"Daily/near-daily; sampled updates 2026-08-13 to 2026-08-18.","licenseNote":"Metadata/abstract discovery; paper licences vary and query has false positives.","whyItMatters":"Directly machine-filterable AI-education research queue.","lastVerified":"2026-08-18; Atom 200 XML"},
  {"name":"Computers & Education: Artificial Intelligence","homepage":"https://www.sciencedirect.com/journal/computers-and-education-artificial-intelligence","feedUrl":"https://rss.sciencedirect.com/publication/science/2666920X","feedFormat":"rss","category":"research","language":"en","region":"GLOBAL","updateCadence":"Issue-driven; date sample not reliable enough to state.","licenseNote":"DO NOT AUTOMATE: RSS robots.txt 200 says Disallow: /. Journal page 403 and articles may be paywalled.","whyItMatters":"Directly relevant peer-reviewed journal for human-reviewed watchlisting.","lastVerified":"2026-08-18; journal 403, RSS 200 XML, RSS robots 200 disallow-all"},
  {"name":"Digital Promise","homepage":"https://digitalpromise.org/","feedUrl":"https://digitalpromise.org/feed/","feedFormat":"rss","category":"practitioner","language":"en","region":"US","updateCadence":"Several per week; sampled 2026-06-29 to 2026-08-17.","licenseNote":"robots.txt 200 empty; no reuse licence inferred.","whyItMatters":"Nonprofit implementation and equity-aware AI resources for districts.","lastVerified":"2026-08-18; RSS 200 XML, robots.txt 200"},
  {"name":"TeachAI","homepage":"https://www.teachai.org/","feedUrl":null,"feedFormat":"none","category":"practitioner","language":"en","region":"US","updateCadence":"No feed; poll resource/news HTML or sitemap weekly.","licenseNote":"robots.txt 200 allows / except API, embedded and SAML paths.","whyItMatters":"School-ready AI guidance and policy resources.","lastVerified":"2026-08-18; homepage 200, robots.txt 200"},
  {"name":"Khan Academy Blog","homepage":"https://blog.khanacademy.org/","feedUrl":"https://blog.khanacademy.org/feed/","feedFormat":"rss","category":"vendor-education","language":"en","region":"GLOBAL","updateCadence":"Several per week; sampled 2026-07-20 to 2026-08-17.","licenseNote":"robots.txt 200 sets Crawl-delay: 10; content markup is not a reuse licence.","whyItMatters":"Khanmigo and major AI-learning product/pedagogy updates.","lastVerified":"2026-08-18; homepage 200, RSS 200 XML, robots.txt 200"},
  {"name":"AI4K12 Initiative","homepage":"https://ai4k12.org/","feedUrl":"https://ai4k12.org/feed/","feedFormat":"rss","category":"practitioner","language":"en","region":"US","updateCadence":"Sparse monthly/quarterly; sampled 2025-02-27 to 2026-02-18.","licenseNote":"robots.txt 200 disallows wp-admin; check individual resource licences.","whyItMatters":"K-12 AI-literacy framework and curriculum watch source.","lastVerified":"2026-08-18; homepage 200, RSS 200 XML, robots.txt 200"},
  {"name":"PanSci 泛科學","homepage":"https://pansci.asia/","feedUrl":"https://pansci.asia/feed","feedFormat":"rss","category":"taiwan-local","language":"zh-tw","region":"TW","updateCadence":"Several broad articles per week; sampled 2026-07-29 to 2026-08-18.","licenseNote":"robots.txt 200 allows /; copyright remains with PanSci/authors unless stated otherwise.","whyItMatters":"Taiwan Chinese-language science communication and local AI-education context.","lastVerified":"2026-08-18; homepage 200, RSS 200 XML, robots.txt 200"},
  {"name":"1EdTech Consortium","homepage":"https://www.1edtech.org/","feedUrl":null,"feedFormat":"none","category":"practitioner","language":"en","region":"GLOBAL","updateCadence":"No valid RSS; use HTML news/sitemap after robots review.","licenseNote":"robots.txt 200; tested rss.xml 404. Standards have separate terms.","whyItMatters":"AI interoperability, learner-data and credential standards shape deployable edtech.","lastVerified":"2026-08-18; homepage 200, RSS candidate 404, robots.txt 200"}
]
```
