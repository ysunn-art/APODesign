/* eslint-disable no-console */
import { generateRoastReport } from "../lib/ai/roast";

const TEST_IMAGE =
  process.env.TEST_IMAGE_URL ||
  "https://picsum.photos/seed/badui-7421/640/480";

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch test image: HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${contentType};base64,${buf.toString("base64")}`;
}

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error("Set GROQ_API_KEY to run this test.");
    process.exit(1);
  }
  console.log(`Fetching test image: ${TEST_IMAGE}`);
  const dataUrl = await fetchAsDataUrl(TEST_IMAGE);
  console.log(`Encoded ${(dataUrl.length / 1024).toFixed(1)} KB as data URL. Sending to Groq…\n`);
  const r = await generateRoastReport(
    { url: dataUrl },
    "Random test image — please attempt a roast."
  );
  console.log(JSON.stringify(r, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
