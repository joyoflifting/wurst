export function isAppNavigation(targetUrl: string, devServerUrl: string | undefined): boolean {
  let target: URL;
  try {
    target = new URL(targetUrl);
  } catch {
    return false;
  }

  if (devServerUrl) {
    let devServer: URL;
    try {
      devServer = new URL(devServerUrl);
    } catch {
      return false;
    }
    return target.origin === devServer.origin;
  }

  return target.protocol === "file:" && target.pathname.endsWith("/renderer/index.html");
}
