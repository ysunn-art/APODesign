/* eslint-disable no-console */
import { generateRoastReport } from "../lib/ai/roast";

const TEST_IMAGE =
  process.env.TEST_IMAGE_URL ||
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png";

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error("Set GROQ_API_KEY to run this test.");
    process.exit(1);
  }
  console.log(`Roasting: ${TEST_IMAGE}\n`);
  const r = await generateRoastReport(TEST_IMAGE, "Random test image — please attempt a roast.");
  console.log(JSON.stringify(r, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
