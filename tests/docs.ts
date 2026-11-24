import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

/** call rebind_docs for every part, as an agent must before any other tool
 *  answers; returns each part's text */
export async function readDocs(client: Client): Promise<string[]> {
  const parts: string[] = [];
  for (let part = 1, total = 1; part <= total; part++) {
    const reply = await client.callTool({
      name: "rebind_docs",
      arguments: { part },
    });
    const text = (reply.content as { text: string }[])[0]!.text;
    total = Number(/^rebind_docs part \d+ of (\d+)/.exec(text)![1]);
    parts.push(text);
  }
  return parts;
}
