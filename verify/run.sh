#!/usr/bin/env bash
# Imports every workflow in verify/workflows into a running n8n container,
# executes it with the n8n CLI and writes a summary of each node's output (or
# the workflow error) to verify/results/<workflow id>.json.
#
# The container must mount this directory at /verify and have the package
# installed in /home/node/.n8n/nodes (see VERIFY.md).
set -euo pipefail

container="${1:-n8n-narkis-verify}"
cd "$(dirname "$0")"
mkdir -p results

docker exec "$container" n8n import:workflow --separate --input=/verify/workflows >/dev/null 2>&1

for workflow in workflows/*.json; do
	id="$(jq -r .id "$workflow")"
	name="$(jq -r .name "$workflow")"
	# A second broker port avoids clashing with the running server's task broker.
	raw="$(docker exec -e N8N_RUNNERS_BROKER_PORT=5690 "$container" \
		n8n execute --id "$id" --rawOutput 2>/dev/null || true)"
	printf '%s\n' "$raw" | awk '/^\{/ { json = 1 } json { print } json && /^\}/ { exit }' | jq --arg name "$name" '
		.data.resultData as $result
		| {
			workflow: $name,
			error: ($result.error | if . then { name, message, description } else null end),
			nodes: ($result.runData | del(.Start) | map_values(.[0] | {
				status: .executionStatus,
				items: [((.data.main // .data.ai_tool // [[]])[0] // [])[] | .json],
				error: (.error.message // null)
			}))
		}' >"results/$id.json"
	echo "$id  $name  ->  $(jq -r 'if .error then "error: " + .error.message else "ok" end' "results/$id.json")"
done
