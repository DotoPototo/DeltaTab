import type { AnyWidgetDefinition } from '@/widgets/types';
import calendar from '@/widgets/calendar';
import clocks from '@/widgets/clocks';
import countdown from '@/widgets/countdown';
import feeds from '@/widgets/feeds';
import github from '@/widgets/github';
import recent from '@/widgets/recent';
import releases from '@/widgets/releases';
import scratchpad from '@/widgets/scratchpad';
import shortcuts from '@/widgets/shortcuts';
import status from '@/widgets/status';
import weather from '@/widgets/weather';

export const WIDGETS: AnyWidgetDefinition[] = [feeds, weather, recent, github, status, releases, scratchpad, shortcuts, calendar, clocks, countdown];

const byType = new Map(WIDGETS.map((w) => [w.type, w]));

export const widgetDefinition = (type: string): AnyWidgetDefinition | undefined => byType.get(type);
