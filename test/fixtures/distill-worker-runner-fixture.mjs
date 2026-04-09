import process from "node:process";

async function readJsonStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const input = await readJsonStdin();

if (String(input.session_id || "").includes("fail")) {
  process.stderr.write("fixture forced failure\n");
  process.exit(1);
}

process.stdout.write(JSON.stringify({
  operation: "written",
  session_id: input.session_id,
  run_reason: "first_distill",
  content_fingerprint: "sha256:fixture",
  distill_version: "v1",
  candidate_count: 1,
  notes: [`fixture-${input.session_id}`],
  note_count: 1
}, null, 2) + "\n");
