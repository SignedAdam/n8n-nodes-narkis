# Verification

End-to-end verification of `n8n-nodes-narkis` 0.1.0 against the live Narkis API, run on 2026-10-29.

## Environment

- n8n **2.45.5** in Docker (`n8nio/n8n:2.45.5`), clean instance.
- The package was built with `npm run build`, packed with `npm pack`, and installed with `npm install` into the
  directory n8n uses for community packages (`/home/node/.n8n/nodes/node_modules/n8n-nodes-narkis`). n8n loaded it
  as the real package, node type `n8n-nodes-narkis.narkis` (tool variant `n8n-nodes-narkis.narkisTool`), exactly as
  after a Community Nodes install.
- Every workflow in [`verify/workflows`](verify/workflows) was imported with `n8n import:workflow` and executed with
  `n8n execute --id <id> --rawOutput`; [`verify/run.sh`](verify/run.sh) does both and writes the node output of each
  run to `verify/results/` (git-ignored).

```bash
npm run build && npm pack --pack-destination /tmp/n8n-verify/pack
mkdir -p /tmp/n8n-verify/nodes && cd /tmp/n8n-verify/nodes && echo '{"name":"installed-nodes","private":true}' > package.json
npm install --omit=peer --package-lock=false ../pack/n8n-nodes-narkis-0.1.0.tgz
docker run --rm --name n8n-narkis-verify -p 5678:5678 \
  -v /tmp/n8n-verify/nodes:/home/node/.n8n/nodes -v "$PWD/verify":/verify n8nio/n8n:2.45.5
./verify/run.sh   # in another shell, from the repository root
```

The AI Agent workflow also needs an OpenRouter credential with id `nkverifyopenrout`
(`n8n import:credentials`); the key is not part of this repository.

## Static checks

| Check                                                                                                                                                                                                | Result                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run build` (`n8n-node build`)                                                                                                                                                                   | ✓ Build successful                                                                             |
| `npm run lint` (`n8n-node lint`, strict mode, default config)                                                                                                                                        | 0 errors, 0 warnings                                                                           |
| `npx n8n-node cloud-support`                                                                                                                                                                         | Cloud support ENABLED: strict mode, default ESLint config, eligible for n8n Cloud verification |
| `@n8n/scan-community-package` 0.41.1 lint, run locally via its exported `analyzePackage` on the source tree and on the unpacked tarball (the provenance and download steps need a published package) | source leg PASS, tarball leg PASS                                                              |
| `RELEASE_MODE=true npm publish --dry-run --access public`                                                                                                                                            | OK, 41 files (dist, README.md, LICENSE.md, package.json)                                       |
| Runtime dependencies                                                                                                                                                                                 | none (`npm install` of the tarball adds 1 package)                                             |
| `npm view n8n-nodes-narkis`                                                                                                                                                                          | 404, name is free                                                                              |

## Results

| Workflow                                                          | Result                                                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nkverify00000001` Photographer by path (us/texas/austin)         | success: Narkis 3 item(s)                                                                                                                        |
| `nkverify00000002` Photographer by slugs (us / new-york / albany) | success: Narkis 5 item(s)                                                                                                                        |
| `nkverify00000003` Photographer by neighborhood path              | success: Narkis 2 item(s)                                                                                                                        |
| `nkverify00000004` Price by path (us/texas/austin)                | success: Narkis 1 item(s)                                                                                                                        |
| `nkverify00000005` Price by slugs (country us)                    | success: Narkis 1 item(s)                                                                                                                        |
| `nkverify00000006` Location filter (us / texas, limit 5)          | success: Narkis 5 item(s)                                                                                                                        |
| `nkverify00000007` Location return all                            | success: Narkis 1682 item(s)                                                                                                                     |
| `nkverify00000008` Guide get many (limit 3)                       | success: Narkis 3 item(s)                                                                                                                        |
| `nkverify00000009` Guide get many (return all)                    | success: Narkis 358 item(s)                                                                                                                      |
| `nkverify00000010` Guide get (linkedin-headshot-tips)             | success: Narkis 1 item(s)                                                                                                                        |
| `nkverify00000011` Error: uncovered path                          | error (expected): Narkis has no photographer directory page for "us/texas/atlantis". The Location → Get Many operation lists every covered path. |
| `nkverify00000012` Error: unknown guide                           | error (expected): No published Narkis guide matches "no-such-guide". The Guide → Get Many operation lists every guide.                           |
| `nkverify00000013` Error: invalid path                            | error (expected): "us/../etc" is not a valid directory path                                                                                      |
| `nkverify00000014` AI Agent with Narkis tools                     | success: Narkis Photographers 3 item(s), Narkis Prices 1 item(s), AI Agent 1 item(s)                                                             |

## Sample outputs

All values below are real output items from the runs above.

### Photographer → Get Many by Location, path `us/texas/austin`, limit 3

First of 3 items:

```json
{
	"name": "Headshots by Max",
	"website": "https://www.maxbeiler.com/",
	"specialties": ["headshots", "commercial", "beauty", "fashion", "editorial"],
	"priceRange": "$625–$925",
	"priceLow": 625,
	"priceHigh": 925,
	"currency": "USD",
	"rating": 5,
	"reviewCount": 14,
	"description": "Max Beiler is a commercial photographer based in Austin specializing in beauty, fashion, and advertising. His work emphasizes skin, light, and detail to create compelling editorial stories. The site provides contact information for booking sessions without listing specific pricing details.",
	"city": "Austin",
	"locationPath": "us/texas/austin",
	"locationName": "Austin, Texas, United States",
	"locationType": "city",
	"guideUrl": "https://narkis.ai/headshot-photographers/us/texas/austin"
}
```

### Photographer → Get Many by Location, Country/State/City `us` / `new-york` / `albany`, return all

5 items. Third item (a photographer without listed prices):

```json
{
	"name": "Natalie Cartz Photography",
	"website": "https://nataliecartzphotography.com/",
	"specialties": ["headshots"],
	"priceRange": null,
	"priceLow": null,
	"priceHigh": null,
	"currency": "USD",
	"rating": null,
	"reviewCount": null,
	"description": "Professional headshot photographer based in Albany, New York, specializing in corporate and personal headshots.",
	"city": "Albany",
	"locationPath": "us/new-york/albany",
	"locationName": "Albany, New York, United States",
	"locationType": "city",
	"guideUrl": "https://narkis.ai/headshot-photographers/us/new-york/albany"
}
```

### Photographer → Get Many by Location, neighborhood guide URL `https://narkis.ai/headshot-photographers/us/new-york/new-york/brooklyn`, limit 2

First item:

```json
{
	"name": "PicMe! Headshots",
	"website": "https://www.picmeheadshots.com",
	"specialties": [
		"headshots",
		"corporate",
		"personal branding",
		"executive portraits",
		"team headshots"
	],
	"priceRange": "$250–$480",
	"priceLow": 250,
	"priceHigh": 480,
	"currency": "USD",
	"rating": 4.8,
	"reviewCount": 40,
	"description": "PicMe! Headshots operates in New York and Brooklyn with a team led by Asia and Lana. They offer both in-studio and on-location sessions designed to be smooth and efficient for busy professionals. Their work appears on magazine covers and websites for top New York companies.",
	"city": "New York",
	"locationPath": "us/new-york/new-york/brooklyn",
	"locationName": "Brooklyn, New York, New York, United States",
	"locationType": "sub_region",
	"guideUrl": "https://narkis.ai/headshot-photographers/us/new-york/new-york/brooklyn"
}
```

### Price → Get by Location, path `us/texas/austin`

```json
{
	"locationPath": "us/texas/austin",
	"locationName": "Austin, Texas, United States",
	"locationType": "city",
	"guideUrl": "https://narkis.ai/headshot-photographers/us/texas/austin",
	"currency": "USD",
	"median": 430,
	"min": 179,
	"max": 1200,
	"averageLow": 342,
	"averageHigh": 692,
	"averageRange": "$342–$692",
	"photographersWithListedPrices": 7
}
```

### Price → Get by Location, Country/State/City `us` (whole country)

```json
{
	"locationPath": "us",
	"locationName": "United States",
	"locationType": "country",
	"guideUrl": "https://narkis.ai/headshot-photographers/us",
	"currency": "USD",
	"median": 494,
	"min": 100,
	"max": 5000,
	"averageLow": 302,
	"averageHigh": 686,
	"averageRange": "$302–$686",
	"photographersWithListedPrices": 1517
}
```

### Location → Get Many, filters country `us`, state `texas`, limit 5

```json
[
	{
		"path": "us/texas/abilene",
		"level": "city",
		"country": "us",
		"state": "texas",
		"city": "abilene",
		"subRegion": null,
		"guideUrl": "https://narkis.ai/headshot-photographers/us/texas/abilene",
		"updatedAt": "2026-07-23T04:12:58.847403Z"
	},
	{
		"path": "us/texas/allen",
		"level": "city",
		"country": "us",
		"state": "texas",
		"city": "allen",
		"subRegion": null,
		"guideUrl": "https://narkis.ai/headshot-photographers/us/texas/allen",
		"updatedAt": "2026-07-23T04:12:58.847403Z"
	},
	{
		"path": "us/texas/alvin",
		"level": "city",
		"country": "us",
		"state": "texas",
		"city": "alvin",
		"subRegion": null,
		"guideUrl": "https://narkis.ai/headshot-photographers/us/texas/alvin",
		"updatedAt": "2026-07-23T04:12:58.847403Z"
	},
	{
		"path": "us/texas/amarillo",
		"level": "city",
		"country": "us",
		"state": "texas",
		"city": "amarillo",
		"subRegion": null,
		"guideUrl": "https://narkis.ai/headshot-photographers/us/texas/amarillo",
		"updatedAt": "2026-07-23T04:12:58.847403Z"
	},
	{
		"path": "us/texas/anna",
		"level": "city",
		"country": "us",
		"state": "texas",
		"city": "anna",
		"subRegion": null,
		"guideUrl": "https://narkis.ai/headshot-photographers/us/texas/anna",
		"updatedAt": "2026-07-23T04:12:58.847403Z"
	}
]
```

### Location → Get Many, return all

1682 items. By level: city 1619, state 54, country 4, sub_region 5. By country: ad 17, li 14, mc 12, us 1639.

### Guide → Get Many, limit 3

```json
[
	{
		"slug": "school-administrator-headshots-principals-superintendents",
		"title": "School Administrator Headshots: What Principals, Superintendents, and District Leaders Actually Need",
		"summary": "Professional headshot guide for school principals, superintendents, and district administrators. What works on school websites, district directories, and community communications.",
		"url": "https://narkis.ai/blog/school-administrator-headshots-principals-superintendents",
		"category": "article",
		"keywords": [],
		"publishedAt": "2026-05-08T18:00:00Z"
	},
	{
		"slug": "construction-industry-professional-headshots",
		"title": "Construction Industry Headshots: Professional Photos for an Industry That Doesn't Think It Needs Them",
		"summary": "Why construction professionals need headshots and how to get them right. Covers project managers, general contractors, site directors, and safety officers.",
		"url": "https://narkis.ai/blog/construction-industry-professional-headshots",
		"category": "article",
		"keywords": [],
		"publishedAt": "2026-05-08T14:00:00Z"
	},
	{
		"slug": "military-to-civilian-career-headshots",
		"title": "Military-to-Civilian Career Headshots: Updating Your Professional Photo for the Transition",
		"summary": "How to update your professional headshot when transitioning from military to civilian career. What to wear, what to change, and why your official photo won't work.",
		"url": "https://narkis.ai/blog/military-to-civilian-career-headshots",
		"category": "article",
		"keywords": [],
		"publishedAt": "2026-05-08T10:00:00Z"
	}
]
```

### Guide → Get Many, return all

358 published guides across 8 pages of 50 (the API reports a total of 358). Newest: `school-administrator-headshots-principals-superintendents`, oldest: `best-remini-alternatives-in-2026-ai-photo-generators-that-actually-create-new-photos`.

### Guide → Get, input `https://narkis.ai/blog/linkedin-headshot-tips`

The `text` field is 13,873 characters of markdown; shown shortened:

```json
{
	"slug": "linkedin-headshot-tips",
	"title": "LinkedIn Headshot Tips: What Actually Gets People to Click Your Profile",
	"summary": "LinkedIn headshot tips that actually matter. Learn what makes recruiters and clients click your profile, common mistakes to avoid, and how to get a professional photo fast.",
	"url": "https://narkis.ai/blog/linkedin-headshot-tips",
	"category": "Guides",
	"keywords": [
		"linkedin headshot tips",
		"linkedin photo tips",
		"how to take a good linkedin photo",
		"linkedin profile photo",
		"professional linkedin headshot"
	],
	"publishedAt": "2026-02-15T20:19:50Z",
	"text": "# LinkedIn Headshot Tips: What Actually Gets People to Click Your Profile\n\nYour LinkedIn headshot is the first thing recruiters, clients, and connections see. Before they read your headline, before they check your experience, they look at your face and make a judgment. That judgment takes about one second.\n\nMost LinkedIn headshots are bad. Not offensively bad, just forgettable. Cropped from a group photo at a wedding. A selfie with visible arm angle. A photo from 2019 that doesn't look like you anymore. The bar is low, which means getting it right gives you a real advantage.\n\nHere's what works, what doesn't, and how to get a headshot that makes people click.\n\n## What size should a LinkedIn headshot be?\n\nLinkedIn recommends a minimum of 400x400 pixels and displays your photo at 200x200 in the feed and up to 400x400 on your profile. For crisp display on high-DPI screens like modern phones …"
}
```

### Errors

- Error: uncovered path: `NodeApiError`: Narkis has no photographer directory page for "us/texas/atlantis". The Location → Get Many operation lists every covered path. (City not found)
- Error: unknown guide: `NodeApiError`: No published Narkis guide matches "no-such-guide". The Guide → Get Many operation lists every guide. (BlogPost not found with identifier: no-such-guide)
- Error: invalid path: `NodeOperationError`: "us/../etc" is not a valid directory path (Use lowercase slugs separated by slashes, for example us/texas/austin. The Location → Get Many operation lists every covered path.)

## AI Agent tool

Workflow `nkverify00000014`: AI Agent (v3.1) with an OpenRouter chat model (`openai/gpt-4o-mini`, temperature 0) and two
Narkis tool nodes (`n8n-nodes-narkis.narkisTool`): Photographer → Get Many by Location and Price → Get by Location,
with **Directory Path** set to `{{ $fromAI('path', …) }}`.

Prompt: _Find three headshot photographers in Austin, Texas and tell me the median listed headshot price there._

- Narkis Photographers tool: success, 3 items, path chosen by the model: `us/texas/austin`
- Narkis Prices tool: success, median 430
- Agent answer:

> Three headshot photographers in Austin, Texas are Headshots by Max, Steven Noreyko Photography, and JD Swiger Photography. The median listed headshot price in Austin is $430.

## Editor UI

Checked in the n8n 2.45.5 editor (headless Chromium, 1440×900):

- The node and both tool nodes render with the Narkis icon (dark theme variant on the dark canvas).
- In workflow `nkverify00000002` the Country, State and City dropdowns load from the API and show
  _United States_, _New York_, _Albany_; **Execute step** returned 5 items.
- Browser console: 0 errors, 0 page errors.

Dropdown methods called through `POST /rest/dynamic-node-parameters/options`:

- `getCountries` → Andorra (`ad`), Liechtenstein (`li`), Monaco (`mc`), United States (`us`)
- `getStates` for `us` → (Whole Country), Alabama, Alaska, Arizona, …
- `getCities` for `us/texas` → (Whole State), Abilene, Allen, Alvin, Amarillo, …
- `getFilterStates` for `mc` → (All States), Municipality of Monaco

## Sales copy removal

Narkis pages carry promotional sentences. The node removes them from every text field it passes through
(photographer descriptions, guide summaries, guide text) with `stripPromo` / `cleanArticle` in
`nodes/Narkis/shared/policy.ts`. Live Austin page texts run through the compiled functions from `dist/`:

| Source text (API)                                                                                                                                                                           | After `stripPromo`                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| FAQ: "Based on 7 headshot photographers in Austin, session prices range from $179 to $1200. Most charge between $342 and $692. AI photo tools like Narkis.ai start at $27 for 200+ photos." | "Based on 7 headshot photographers in Austin, session prices range from $179 to $1200. Most charge between $342 and $692." |
| Meta description: "Find and compare headshot photographers in Austin, Texas. See pricing, reviews, and portfolios. Or get AI headshots from $27."                                           | "Find and compare headshot photographers in Austin, Texas. See pricing, reviews, and portfolios."                          |

The cost guide `how-much-do-professional-headshots-cost-in-2026` shrinks from 17,293 to 15,371 characters, with no
Narkis package price, pricing/checkout/signup link or call to action left. The node's own parameter and operation
descriptions contain no prices, signup links or sales copy.
