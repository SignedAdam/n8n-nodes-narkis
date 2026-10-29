# n8n-nodes-narkis

This is an n8n community node. It lets you use the public [Narkis](https://narkis.ai/headshot-photographers) headshot photographer directory in your n8n workflows.

Narkis publishes a directory of professional headshot photographers in the United States, Andorra, Liechtenstein and Monaco, with the price ranges photographers list, plus a library of guides about professional photos (LinkedIn headshots, posing, outfits, costs and more). The node reads that public data: photographers for a place, listed price statistics, the covered locations, and the guides.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Example workflow](#example-workflow)
[Resources](#resources)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. The package name is `n8n-nodes-narkis`.

The package has no runtime dependencies.

## Operations

| Resource     | Operation            | What it returns                                                                                                                                                                        |
| ------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Photographer | Get Many by Location | One item per photographer listed for a country, state, city or neighborhood: name, website, specialties, listed price range, rating, review count, description, and the city guide URL |
| Price        | Get by Location      | One item with the listed price statistics for a place: median, lowest, highest, average range, and how many photographers list a price                                                 |
| Location     | Get Many             | One item per covered directory path (for example `us/texas/austin`) with its level and city guide URL. Optional filters: country, state                                                |
| Guide        | Get Many             | Published guides, newest first: slug, title, summary, URL, category, keywords, publish date                                                                                            |
| Guide        | Get                  | One guide by slug or narkis.ai blog URL, with the full article text as markdown                                                                                                        |

All operations are read only. Prices are in US dollars, as listed by the photographers.

### Choosing a location

Photographer and Price operations take a location in one of two ways:

- **Directory Path**: lowercase slugs separated by slashes, `country/state/city`, for example `us`, `us/texas`, `us/texas/austin` or `us/new-york/new-york/brooklyn`. A city guide URL such as `https://narkis.ai/headshot-photographers/us/texas/austin` works too.
- **Country, State and City**: pick each level from dropdowns that list the covered places. Leave City empty for a whole state, or State empty for a whole country.

Use **Location → Get Many** to list every covered path. City and neighborhood paths return every listed photographer; country and state paths return the photographers Narkis features for that area.

### Output notes

Text passed through from Narkis pages (photographer descriptions, guide summaries and articles) is cleaned of Narkis's own promotional sentences, such as product prices or calls to action, and links to transactional pages are removed. Photographer prices are never altered.

## Credentials

No credentials needed. The node only reads public data from `https://api.narkis.ai`.

## Compatibility

- Tested with n8n 2.45.5 (Docker image `n8nio/n8n:2.45.5`), installed as a community package.
- Built with `@n8n/node-cli` 0.54 against `n8n-workflow` 2.45, `n8nNodesApiVersion` 1. Earlier n8n versions that support declarative community nodes should work but are not tested.
- Works as an AI Agent tool (`usableAsTool`).

## Usage

### As an AI Agent tool

Add the Narkis node as a tool of an AI Agent and let the model fill the location, for example set **Directory Path** to:

```
{{ $fromAI('path', 'Narkis directory path: lowercase country/state/city slugs, for example us/texas/austin', 'string') }}
```

Give the tool a description such as "Get headshot photographers listed in the Narkis directory for a place, given its directory path". A Photographer tool and a Price tool together answer questions like "Who are some headshot photographers in Austin and what does a session usually cost?".

### Errors

- A path that Narkis does not cover returns a "no photographer directory page" error. Check the path with Location → Get Many.
- An unknown guide slug returns a "no published Narkis guide" error.
- Enable **Continue On Fail** in the node settings to keep the workflow running and receive the error as an item.

## Example workflow

Lists the first three photographers in Austin, Texas. Copy the JSON and paste it into the n8n editor.

```json
{
	"name": "Narkis: photographers in Austin",
	"nodes": [
		{
			"parameters": {},
			"name": "Start",
			"type": "n8n-nodes-base.manualTrigger",
			"typeVersion": 1,
			"position": [0, 0]
		},
		{
			"parameters": {
				"resource": "photographer",
				"operation": "getManyByLocation",
				"locateBy": "path",
				"path": "us/texas/austin",
				"limit": 3
			},
			"name": "Narkis",
			"type": "n8n-nodes-narkis.narkis",
			"typeVersion": 1,
			"position": [220, 0]
		}
	],
	"connections": {
		"Start": {
			"main": [[{ "node": "Narkis", "type": "main", "index": 0 }]]
		}
	}
}
```

One output item looks like this:

```json
{
	"name": "Steven Noreyko Photography",
	"website": "https://www.headshot-photos.com",
	"specialties": ["headshots", "corporate", "actors", "musicians", "social media"],
	"priceRange": "$179–$269",
	"priceLow": 179,
	"priceHigh": 269,
	"currency": "USD",
	"rating": 4.9,
	"reviewCount": 60,
	"description": "Steven Noreyko operates a headshot photography business in Austin, Texas serving actors, corporate executives, and business professionals. The studio offers specialized sessions for social media profiles and acting portfolios to help clients stand out in their respective fields.",
	"city": "Austin",
	"locationPath": "us/texas/austin",
	"locationName": "Austin, Texas, United States",
	"locationType": "city",
	"guideUrl": "https://narkis.ai/headshot-photographers/us/texas/austin"
}
```

More workflows, one per operation plus an AI Agent example, are in [`verify/workflows`](verify/workflows).

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Narkis headshot photographer directory](https://narkis.ai/headshot-photographers)
- [Narkis guides](https://narkis.ai/blog)

## Version history

### 0.1.0

First release: Photographer, Price, Location and Guide resources.
