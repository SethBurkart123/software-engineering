import asyncio
import aiohttp
import time
from tqdm.asyncio import tqdm

urls = [
    "http://lbmegc3rjnekmdxuisynqdc7y3m2tgyq7gj257ooddaobxqjw36bdayd.onion",
    "https://baresearch.org",
    "https://copp.gg",
    "https://darmarit.org/searx",
    "https://etsi.me",
    "https://fairsuch.net",
    "https://northboot.xyz",
    "https://nyc1.sx.ggtyler.dev",
    "https://ooglester.com",
    "https://opnxng.com",
    "https://paulgo.io",
    "https://priv.au",
    "https://s.mble.dk",
    "https://s.trung.fun",
    "https://search.bus-hit.me",
    "https://search.charliewhiskey.net",
    "https://search.citw.lgbt",
    "https://search.darkness.services",
    "https://search.datura.network",
    "https://search.demoniak.ch",
    "https://search.dotone.nl",
    "https://search.einfachzocken.eu",
    "https://search.gcomm.ch",
    "https://search.hbubli.cc",
    "https://search.im-in.space",
    "https://search.in.projectsegfau.lt",
    "https://search.incogniweb.net",
    "https://search.indst.eu",
    "https://search.inetol.net",
    "https://search.ldne.xyz",
    "https://search.leptons.xyz",
    "https://search.mdosch.de",
    "https://search.nadeko.net",
    "https://search.nerdvpn.de",
    "https://search.ngn.tf",
    "https://search.ononoki.org",
    "https://search.privacyredirect.com",
    "https://search.projectsegfau.lt",
    "https://search.rhscz.eu",
    "https://search.rowie.at",
    "https://search.sapti.me",
    "https://search.smnz.de",
    "https://search.us.projectsegfau.lt",
    "https://searx.aleteoryx.me",
    "https://searx.ankha.ac",
    "https://searx.ari.lt",
    "https://searx.baczek.me",
    "https://searx.be",
    "https://searx.catfluori.de",
    "https://searx.colbster937.dev",
    "https://searx.daetalytica.io",
    "https://searx.dresden.network",
    "https://searx.foss.family",
    "https://searx.hu",
    "https://searx.juancord.xyz",
    "https://searx.lunar.icu",
    "https://searx.namejeff.xyz",
    "https://searx.nobulart.com",
    "https://searx.numeriquement.fr",
    "https://searx.oakleycord.dev",
    "https://searx.ox2.fr",
    "https://searx.perennialte.ch",
    "https://searx.rhscz.eu",
    "https://searx.sev.monster",
    "https://searx.techsaviours.org",
    "https://searx.tiekoetter.com",
    "https://searx.tuxcloud.net",
    "https://searx.work",
    "https://searx.zhenyapav.com",
    "https://searxng.brihx.fr",
    "https://searxng.ca",
    "https://searxng.ch",
    "https://searxng.hweeren.com",
    "https://searxng.online",
    "https://searxng.shreven.org",
    "https://searxng.site",
    "https://skyrimhater.com",
    "https://sx.catgirl.cloud",
    "https://sx.thatxtreme.dev",
    "https://sxng.violets-purgatory.dev",
    "https://vanderwilhelm.me",
    "https://www.gruble.de",
    "https://www.jabber-germany.de/searx",
    "https://xo.wtf"
]

search_queries = [
    "quantum engineering",
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "neural networks"
]

semaphore = asyncio.Semaphore(5)

async def fetch(session, url, query):
    search_url = f"{url}/search?q={query}"
    start = time.time()
    try:
        async with session.get(search_url, ssl=False) as response:
            await response.text()
            return time.time() - start
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return float('inf')

async def test_url(url):
    async with semaphore:
        async with aiohttp.ClientSession() as session:
            times = []
            for query in search_queries:
                times.append(await fetch(session, url, query))
                await asyncio.sleep(2)
            return url, sum(times) / len(times)

async def main():
    results = []
    for result in tqdm(asyncio.as_completed([test_url(url) for url in urls]), total=len(urls)):
        results.append(await result)
    
    results = sorted(results, key=lambda x: x[1])
    print("\nFastest Searx Instances:")
    for url, avg_time in results:
        if avg_time < float('inf'):
            print(f"{url}: {avg_time:.2f} seconds")
        else:
            print(f"{url}: Could not be reached")

if __name__ == "__main__":
    asyncio.run(main())

'''

Fastest Searx Instances:
https://searx.perennialte.ch: 0.02 seconds
https://opnxng.com: 0.16 seconds
https://s.trung.fun: 0.21 seconds
https://priv.au: 0.22 seconds
https://ooglester.com: 0.24 seconds
https://search.ononoki.org: 0.24 seconds
https://searxng.hweeren.com: 0.24 seconds
https://search.us.projectsegfau.lt: 0.24 seconds
https://searx.juancord.xyz: 0.27 seconds
https://search.in.projectsegfau.lt: 0.29 seconds
https://searx.daetalytica.io: 0.29 seconds
https://sxng.violets-purgatory.dev: 0.29 seconds
https://baresearch.org: 0.30 seconds
https://searx.oakleycord.dev: 0.31 seconds
https://copp.gg: 0.33 seconds
https://searx.aleteoryx.me: 0.33 seconds
https://searx.work: 0.33 seconds
https://searxng.online: 0.35 seconds
https://nyc1.sx.ggtyler.dev: 0.35 seconds
https://search.darkness.services: 0.36 seconds
https://xo.wtf: 0.38 seconds
https://searx.sev.monster: 0.40 seconds
https://search.sapti.me: 0.42 seconds
https://searxng.ca: 0.43 seconds
https://search.im-in.space: 0.43 seconds
https://searxng.ch: 0.44 seconds
https://search.leptons.xyz: 0.44 seconds
https://s.mble.dk: 0.44 seconds
https://searx.tiekoetter.com: 0.44 seconds
https://search.mdosch.de: 0.45 seconds
https://fairsuch.net: 0.45 seconds
https://darmarit.org/searx: 0.46 seconds
https://searx.be: 0.46 seconds
https://sx.catgirl.cloud: 0.46 seconds
https://searx.nobulart.com: 0.46 seconds
https://searx.baczek.me: 0.46 seconds
https://search.incogniweb.net: 0.46 seconds
https://search.projectsegfau.lt: 0.46 seconds
https://searx.catfluori.de: 0.47 seconds
https://searx.zhenyapav.com: 0.47 seconds
https://searx.colbster937.dev: 0.48 seconds
https://searx.foss.family: 0.48 seconds
https://vanderwilhelm.me: 0.49 seconds
https://search.citw.lgbt: 0.50 seconds
https://search.bus-hit.me: 0.51 seconds
https://searx.dresden.network: 0.51 seconds
https://skyrimhater.com: 0.51 seconds
https://searx.ox2.fr: 0.51 seconds
https://search.hbubli.cc: 0.52 seconds
https://search.privacyredirect.com: 0.52 seconds
https://search.einfachzocken.eu: 0.52 seconds
https://searxng.shreven.org: 0.52 seconds
https://searxng.site: 0.53 seconds
https://searx.rhscz.eu: 0.53 seconds
https://paulgo.io: 0.54 seconds
https://etsi.me: 0.54 seconds
https://search.gcomm.ch: 0.54 seconds
https://search.ldne.xyz: 0.54 seconds
https://searx.namejeff.xyz: 0.54 seconds
https://searx.ari.lt: 0.55 seconds
https://search.dotone.nl: 0.55 seconds
https://search.demoniak.ch: 0.56 seconds
https://search.nerdvpn.de: 0.57 seconds
https://search.inetol.net: 0.59 seconds
https://searx.tuxcloud.net: 0.59 seconds
https://searx.techsaviours.org: 0.60 seconds
https://search.ngn.tf: 0.62 seconds
https://searxng.brihx.fr: 0.62 seconds
https://sx.thatxtreme.dev: 0.63 seconds
https://search.smnz.de: 0.64 seconds
https://search.charliewhiskey.net: 0.65 seconds
https://searx.ankha.ac: 0.67 seconds
https://search.rowie.at: 0.67 seconds
https://search.indst.eu: 0.68 seconds
https://searx.lunar.icu: 0.71 seconds
https://searx.hu: 0.97 seconds
https://search.datura.network: 1.01 seconds
https://www.jabber-germany.de/searx: 1.05 seconds
https://searx.numeriquement.fr: 1.09 seconds
https://search.rhscz.eu: 1.25 seconds
https://northboot.xyz: 1.38 seconds

'''