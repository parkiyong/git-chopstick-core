import { envForAuthentication } from './authentication.js'
import { resolveGitProxy as resolveGitProxyFn } from '../lib/resolve-git-proxy.js'
import { getHTMLURL } from '../lib/api.js'
import { Repository } from '../models/repository.js'
import { IRemote } from '../models/remote.js'

/**
 * For many remote operations it's well known what the primary remote
 * url is (clone, push, fetch etc). But in some cases it's not as easy.
 *
 * Two examples are checkout, and revert where neither would need to
 * hit the network in vanilla Git usage but do need to when LFS gets
 * involved.
 *
 * What's the primary url when using LFS then? Most likely it's gonna
 * be on the same as the default remote but it could theoretically
 * be on a different server as well. That's too advanced for our usage
 * at the moment though so we'll just need to figure out some reasonable
 * url to fall back on.
 *
 * @param branchName If the operation we're about to undertake is related to a
 *                   local ref (i.e branch) then we can use that to resolve its
 *                   upstream tracking branch (and thereby its remote) and use
 *                   that as the probable url to resolve a proxy for.
 */
export function getFallbackUrlForProxyResolve(
  _repository: Repository,
  currentRemote: IRemote | null
) {
  if (currentRemote) {
    return currentRemote.url
  }
  return 'https://github.com'
}

/**
 * Create a set of environment variables to use when invoking a Git
 * subcommand that needs to communicate with a remote (i.e. fetch, clone,
 * push, pull, ls-remote, etc etc).
 *
 * The environment variables deal with setting up sane defaults, configuring
 * authentication, and resolving proxy urls if necessary.
 *
 * @param account   The authentication information (if available) to provide
 *                  to Git for use when connecting to the remote
 * @param remoteUrl The primary remote URL for this operation. Note that Git
 *                  might connect to other remotes in order to fulfill the
 *                  operation. As an example, a clone of
 *                  https://github.com/desktop/desktop could contain a submodule
 *                  pointing to another host entirely. Used to resolve which
 *                  proxy (if any) should be used for the operation.
 */
export async function envForRemoteOperation(remoteUrl: string | null): Promise<Record<string, string | undefined>> {
  return {
    ...envForAuthentication(),
    ...(await envForProxy(remoteUrl ?? 'https://github.com')),
  }
}

/**
 * Not intended to be used directly. Exported only in order to
 * allow for testing.
 *
 * @param remoteUrl The remote url to resolve a proxy for.
 * @param env       The current environment variables, defaults
 *                  to `process.env`
 * @param resolve   The method to use when resolving the proxy url,
 *                  defaults to `resolveGitProxy`
 */
export async function envForProxy(
  remoteUrl: string,
  env: NodeJS.ProcessEnv = process.env,
  resolve: (url: string) => Promise<string | undefined> = async (url: string) => resolveGitProxyFn() ?? undefined
): Promise<Record<string, string | undefined> | undefined> {
  const protocolMatch = /^(https?):\/\//i.exec(remoteUrl)

  // We can only resolve and use a proxy for the protocols where cURL
  // would be involved (i.e http and https). git:// relies on ssh.
  if (protocolMatch === null) {
    return
  }

  // Note that HTTPS here doesn't mean that the proxy is HTTPS, only
  // that all requests to HTTPS protocols should be proxied. The
  // proxy protocol is defined by the url returned by `this.resolve()`
  const proto = protocolMatch[1].toLowerCase() // http or https

  // We'll play it safe and say that if the user has configured
  // the ALL_PROXY environment variable they probably know what
  // they're doing and wouldn't want us to override it with a
  // protocol-specific proxy. cURL supports both lower and upper
  // case, see:
  // https://github.com/curl/curl/blob/14916a82e/lib/url.c#L2180-L2185
  if ('ALL_PROXY' in env || 'all_proxy' in env) {
    console.info(`proxy url not resolved, ALL_PROXY already set`)
    return
  }

  // Lower case environment variables due to
  // https://ec.haxx.se/usingcurl/usingcurl-proxies#http_proxy-in-lower-case-only
  const envKey = `${proto}_proxy` // http_proxy or https_proxy

  // If the user has already configured a proxy in the environment
  // for the protocol we're not gonna override it.
  if (envKey in env || (proto === 'https' && 'HTTPS_PROXY' in env)) {
    console.info(`proxy url not resolved, ${envKey} already set`)
    return
  }

  const proxyUrl = await resolve(remoteUrl).catch(err => {
    console.error('Failed resolving Git proxy', err)
    return undefined
  })

  return proxyUrl === undefined ? undefined : { [envKey]: proxyUrl }
}
