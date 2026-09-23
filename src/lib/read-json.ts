/** Parses a fetch response as JSON, turning an empty or non-JSON body into a readable error. */
export async function readJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      res.status === 413
        ? "The photo is too large to upload."
        : `The server returned an unexpected response (${res.status}). Please try again.`,
    );
  }
}
