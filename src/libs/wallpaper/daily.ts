import { storage } from 'wxt/utils/storage';
import { fetchBlob, fetchJson } from '@/libs/http';
import { readSettings } from '@/libs/settings';
import { processImage, storageOptions } from '@/libs/wallpaper/image';
import { MINUTE } from '@/libs/time';
import { dailyItem, displayItem, setDaily, sweepOrphans, toWallpaper, type DailySource, type Wallpaper } from '@/libs/wallpaper/library';

interface DailyImage {
  day: string;
  url: string;
  title?: string;
  credit?: string;
  link?: string;
}

interface BingResponse {
  images: { startdate: string; urlbase: string; title: string; copyright: string; copyrightlink: string }[];
}

interface WikimediaResponse {
  image?: {
    title: string;
    thumbnail: { source: string };
    image: { source: string; width: number };
    file_page: string;
    artist?: { text: string };
    description?: { text: string };
    license?: { type: string };
  };
}

// Wikimedia only serves thumbnails at standard widths; anything else is a 400.
const WIKIMEDIA_WIDTHS = [1280, 1920, 3840];

export const wikimediaImageUrl = (image: NonNullable<WikimediaResponse['image']>, targetWidth: number): string => {
  const isVector = /\.svg$/i.test(new URL(image.image.source).pathname);
  const width = WIKIMEDIA_WIDTHS.find((w) => w >= targetWidth) ?? WIKIMEDIA_WIDTHS.at(-1)!;
  if (!isVector && image.image.width <= width) return image.image.source;
  const thumb = new URL(image.thumbnail.source);
  thumb.search = '';
  thumb.pathname = thumb.pathname.replace(/\/\d+px-([^/]+)$/, `/${width}px-$1`);
  return thumb.toString();
};

const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const today = (source: DailySource) => (source === 'bing' ? localDay().replaceAll('-', '') : localDay());

export const isOutdated = (wallpaper: Wallpaper, source: DailySource) => !wallpaper.day || wallpaper.day < today(source);

// Bing's day can trail the local date for hours; without a throttle every new tab would ask again.
const CHECK_INTERVAL = 30 * MINUTE;
const checkedItem = storage.defineItem<Partial<Record<DailySource, number>>>('local:wallpapers-daily-checked', { fallback: {} });

const PROVIDERS: Record<DailySource, (targetWidth: number) => Promise<DailyImage>> = {
  async bing() {
    const market = encodeURIComponent(navigator.language || 'en-US');
    const { images } = await fetchJson<BingResponse>(`https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=${market}`);
    const [image] = images;
    if (!image) throw new Error('Bing returned no image');
    return {
      day: image.startdate,
      url: `https://www.bing.com${image.urlbase}_UHD.jpg`,
      title: image.title,
      credit: image.copyright,
      link: image.copyrightlink,
    };
  },

  async wikimedia(targetWidth) {
    const day = localDay();
    const { image } = await fetchJson<WikimediaResponse>(`https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${day.replaceAll('-', '/')}`);
    if (!image) throw new Error('No picture of the day yet');
    return {
      day,
      url: wikimediaImageUrl(image, targetWidth),
      title: image.description?.text ?? image.title.replace(/^File:|\.\w+$/g, ''),
      // Attribution as Commons asks for it, with the file page (full licence terms) as the link.
      credit: [image.artist?.text, image.license?.type].filter(Boolean).join(', ') || undefined,
      link: image.file_page,
    };
  },
};

export const DAILY_SOURCES = Object.keys(PROVIDERS) as DailySource[];

// Concurrent callers (tabs, the background alarm) collapse onto one run via a Web Lock.
export const refreshDaily = (source: DailySource, process: typeof processImage = processImage): Promise<Wallpaper | undefined> =>
  navigator.locks.request(`daily:${source}`, async () => {
    const current = (await dailyItem.getValue())[source];
    const checked = await checkedItem.getValue();
    if (current && Date.now() - (checked[source] ?? 0) < CHECK_INTERVAL) return current;

    const [display, settings] = await Promise.all([displayItem.getValue(), readSettings()]);
    const options = storageOptions(settings.wallpaper.resolution, settings.wallpaper.quality, display);
    const meta = await PROVIDERS[source](Math.min(options.maxWidth, 3840));
    await checkedItem.setValue({ ...checked, [source]: Date.now() });
    if (current?.day === meta.day) return current;

    const processed = await process(await fetchBlob(meta.url, { timeout: MINUTE }), options);
    const wallpaper = toWallpaper(`daily-${source}-${meta.day}`, processed, source, {
      day: meta.day,
      title: meta.title,
      credit: meta.credit,
      link: meta.link,
    });
    await setDaily(source, wallpaper, processed);
    await sweepOrphans();
    return wallpaper;
  });
