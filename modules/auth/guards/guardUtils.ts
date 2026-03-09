export function buildLoginRedirectUrl(
    redirectTo: string,
    pathname: string
): string {
    const params = new URLSearchParams();

    if (pathname && pathname !== redirectTo) {
        params.set("callbackUrl", pathname);
    }

    const query = params.toString();
    return query ? `${redirectTo}?${query}` : redirectTo;
}
