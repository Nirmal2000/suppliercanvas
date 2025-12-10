import { HttpsProxyAgent } from 'https-proxy-agent';

export function createProxyAgent(): HttpsProxyAgent<string> | undefined {
  const domain = process.env.PROXY_DOMAIN;
  const port = process.env.PROXY_PORT;
  const username = process.env.PROXY_USERNAME;
  const password = process.env.PROXY_PASSWORD;

  if (!domain || !port || !username || !password) {
    console.warn('Proxy configuration incomplete, requests will be made directly');
    return undefined;
  }

  const proxyUrl = `http://${username}:${password}@${domain}:${port}`;
  return new HttpsProxyAgent(proxyUrl);
}
