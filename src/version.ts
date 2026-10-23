declare const __QUIZLAB_BUILD_ID__: string;
export const currentBuildId =
  typeof __QUIZLAB_BUILD_ID__ === "undefined"
    ? "development"
    : __QUIZLAB_BUILD_ID__;
export async function hasNewBuild(
  buildId = currentBuildId,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetcher("/app-version.json", { cache: "no-store" });
    if (!response.ok) return false;
    const data = await response.json();
    return (
      typeof data?.buildId === "string" &&
      data.buildId.length > 0 &&
      data.buildId !== buildId
    );
  } catch {
    return false;
  }
}
