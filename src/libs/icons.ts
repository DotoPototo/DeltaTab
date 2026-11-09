import type { Component } from 'vue';

// Compiled in by unplugin-icons, so nothing is fetched from the Iconify API at runtime.
import FaOldChevronDown from '~icons/fa-solid/chevron-down';
import FaOldChevronUp from '~icons/fa-solid/chevron-up';
import FaOldCog from '~icons/fa-solid/cog';
import FaOldPaintBrush from '~icons/fa-solid/paint-brush';
import FaOldPaintRoller from '~icons/fa-solid/paint-roller';
import FaOldQuestionCircle from '~icons/fa-solid/question-circle';
import FabFigma from '~icons/fa6-brands/figma';
import FabGithub from '~icons/fa6-brands/github';
import FabGitlab from '~icons/fa6-brands/gitlab';
import FabGoogleDrive from '~icons/fa6-brands/google-drive';
import FabHackerNews from '~icons/fa6-brands/hacker-news';
import FabJira from '~icons/fa6-brands/jira';
import FabNpm from '~icons/fa6-brands/npm';
import FabReddit from '~icons/fa6-brands/reddit';
import FabStackOverflow from '~icons/fa6-brands/stack-overflow';
import FaArrowUp from '~icons/fa6-solid/arrow-up';
import FaChevronLeft from '~icons/fa6-solid/chevron-left';
import FaChevronRight from '~icons/fa6-solid/chevron-right';
import FaClock from '~icons/fa6-solid/clock';
import FaCloud from '~icons/fa6-solid/cloud';
import FaCloudBolt from '~icons/fa6-solid/cloud-bolt';
import FaCloudMoon from '~icons/fa6-solid/cloud-moon';
import FaCloudMoonRain from '~icons/fa6-solid/cloud-moon-rain';
import FaCloudRain from '~icons/fa6-solid/cloud-rain';
import FaCloudShowersHeavy from '~icons/fa6-solid/cloud-showers-heavy';
import FaCloudSun from '~icons/fa6-solid/cloud-sun';
import FaCloudSunRain from '~icons/fa6-solid/cloud-sun-rain';
import FaCode from '~icons/fa6-solid/code';
import FaComment from '~icons/fa6-solid/comment';
import FaDroplet from '~icons/fa6-solid/droplet';
import FaFilter from '~icons/fa6-solid/filter';
import FaMoon from '~icons/fa6-solid/moon';
import FaPlus from '~icons/fa6-solid/plus';
import FaRotateLeft from '~icons/fa6-solid/rotate-left';
import FaSmog from '~icons/fa6-solid/smog';
import FaSnowflake from '~icons/fa6-solid/snowflake';
import FaStar from '~icons/fa6-solid/star';
import FaSun from '~icons/fa6-solid/sun';
import FaTemperatureHalf from '~icons/fa6-solid/temperature-half';
import FaUmbrella from '~icons/fa6-solid/umbrella';
import FaWind from '~icons/fa6-solid/wind';
import FaWindowMaximize from '~icons/fa6-solid/window-maximize';
import FaXmark from '~icons/fa6-solid/xmark';
import LmLoadingTwotoneLoop from '~icons/line-md/loading-twotone-loop';
import MsAddRounded from '~icons/material-symbols/add-rounded';
import MsBookmarkAddOutlineRounded from '~icons/material-symbols/bookmark-add-outline-rounded';
import MsBookmarkOutlineRounded from '~icons/material-symbols/bookmark-outline-rounded';
import MsBugReportOutlineRounded from '~icons/material-symbols/bug-report-outline-rounded';
import MsCalendarMonthOutlineRounded from '~icons/material-symbols/calendar-month-outline-rounded';
import MsCheckCircleOutlineRounded from '~icons/material-symbols/check-circle-outline-rounded';
import MsCheckRounded from '~icons/material-symbols/check-rounded';
import MsChecklistRounded from '~icons/material-symbols/checklist-rounded';
import MsCloseRounded from '~icons/material-symbols/close-rounded';
import MsColorizeRounded from '~icons/material-symbols/colorize-rounded';
import MsCloudOffOutlineRounded from '~icons/material-symbols/cloud-off-outline-rounded';
import MsCodeRounded from '~icons/material-symbols/code-rounded';
import MsDatabaseOutline from '~icons/material-symbols/database-outline';
import MsDeleteOutlineRounded from '~icons/material-symbols/delete-outline-rounded';
import MsDescriptionOutlineRounded from '~icons/material-symbols/description-outline-rounded';
import MsDownloadRounded from '~icons/material-symbols/download-rounded';
import MsDragIndicator from '~icons/material-symbols/drag-indicator';
import MsEditOutlineRounded from '~icons/material-symbols/edit-outline-rounded';
import MsErrorOutlineRounded from '~icons/material-symbols/error-outline-rounded';
import MsHistoryRounded from '~icons/material-symbols/history-rounded';
import MsHourglassEmptyRounded from '~icons/material-symbols/hourglass-empty-rounded';
import MsImageOutlineRounded from '~icons/material-symbols/image-outline-rounded';
import MsInboxOutlineRounded from '~icons/material-symbols/inbox-outline-rounded';
import MsInfoOutlineRounded from '~icons/material-symbols/info-outline-rounded';
import MsLinkRounded from '~icons/material-symbols/link-rounded';
import MsLocationOnOutlineRounded from '~icons/material-symbols/location-on-outline-rounded';
import MsLockOpenOutlineRounded from '~icons/material-symbols/lock-open-outline-rounded';
import MsMergeTypeRounded from '~icons/material-symbols/merge-type-rounded';
import MsMonitorHeartOutlineRounded from '~icons/material-symbols/monitor-heart-outline-rounded';
import MsNotificationsOutlineRounded from '~icons/material-symbols/notifications-outline-rounded';
import MsOpenInNewRounded from '~icons/material-symbols/open-in-new-rounded';
import MsPartlyCloudyDayOutlineRounded from '~icons/material-symbols/partly-cloudy-day-outline-rounded';
import MsPublic from '~icons/material-symbols/public';
import MsRefreshRounded from '~icons/material-symbols/refresh-rounded';
import MsRocketLaunchOutlineRounded from '~icons/material-symbols/rocket-launch-outline-rounded';
import MsRssFeedRounded from '~icons/material-symbols/rss-feed-rounded';
import MsScheduleOutlineRounded from '~icons/material-symbols/schedule-outline-rounded';
import MsSkipNextRounded from '~icons/material-symbols/skip-next-rounded';
import MsSpaceDashboardOutlineRounded from '~icons/material-symbols/space-dashboard-outline-rounded';
import MsStickyNote2OutlineRounded from '~icons/material-symbols/sticky-note-2-outline-rounded';
import MsSwapHorizRounded from '~icons/material-symbols/swap-horiz-rounded';
import MsTimerOutlineRounded from '~icons/material-symbols/timer-outline-rounded';
import MsTuneRounded from '~icons/material-symbols/tune-rounded';
import MsUploadRounded from '~icons/material-symbols/upload-rounded';
import MsWallpaperRounded from '~icons/material-symbols/wallpaper-rounded';
import MsWarningOutlineRounded from '~icons/material-symbols/warning-outline-rounded';
import MsWavingHandOutlineRounded from '~icons/material-symbols/waving-hand-outline-rounded';

export const ICONS = {
  'fa-solid:chevron-down': FaOldChevronDown,
  'fa-solid:chevron-up': FaOldChevronUp,
  'fa-solid:cog': FaOldCog,
  'fa-solid:paint-brush': FaOldPaintBrush,
  'fa-solid:paint-roller': FaOldPaintRoller,
  'fa-solid:question-circle': FaOldQuestionCircle,
  'fa6-brands:figma': FabFigma,
  'fa6-brands:github': FabGithub,
  'fa6-brands:gitlab': FabGitlab,
  'fa6-brands:google-drive': FabGoogleDrive,
  'fa6-brands:hacker-news': FabHackerNews,
  'fa6-brands:jira': FabJira,
  'fa6-brands:npm': FabNpm,
  'fa6-brands:reddit': FabReddit,
  'fa6-brands:stack-overflow': FabStackOverflow,
  'fa6-solid:arrow-up': FaArrowUp,
  'fa6-solid:chevron-left': FaChevronLeft,
  'fa6-solid:chevron-right': FaChevronRight,
  'fa6-solid:clock': FaClock,
  'fa6-solid:cloud': FaCloud,
  'fa6-solid:cloud-bolt': FaCloudBolt,
  'fa6-solid:cloud-moon': FaCloudMoon,
  'fa6-solid:cloud-moon-rain': FaCloudMoonRain,
  'fa6-solid:cloud-rain': FaCloudRain,
  'fa6-solid:cloud-showers-heavy': FaCloudShowersHeavy,
  'fa6-solid:cloud-sun': FaCloudSun,
  'fa6-solid:cloud-sun-rain': FaCloudSunRain,
  'fa6-solid:code': FaCode,
  'fa6-solid:comment': FaComment,
  'fa6-solid:droplet': FaDroplet,
  'fa6-solid:filter': FaFilter,
  'fa6-solid:moon': FaMoon,
  'fa6-solid:plus': FaPlus,
  'fa6-solid:rotate-left': FaRotateLeft,
  'fa6-solid:smog': FaSmog,
  'fa6-solid:snowflake': FaSnowflake,
  'fa6-solid:star': FaStar,
  'fa6-solid:sun': FaSun,
  'fa6-solid:temperature-half': FaTemperatureHalf,
  'fa6-solid:umbrella': FaUmbrella,
  'fa6-solid:wind': FaWind,
  'fa6-solid:window-maximize': FaWindowMaximize,
  'fa6-solid:xmark': FaXmark,
  'line-md:loading-twotone-loop': LmLoadingTwotoneLoop,
  'material-symbols:add-rounded': MsAddRounded,
  'material-symbols:bookmark-add-outline-rounded': MsBookmarkAddOutlineRounded,
  'material-symbols:bookmark-outline-rounded': MsBookmarkOutlineRounded,
  'material-symbols:bug-report-outline-rounded': MsBugReportOutlineRounded,
  'material-symbols:calendar-month-outline-rounded': MsCalendarMonthOutlineRounded,
  'material-symbols:check-circle-outline-rounded': MsCheckCircleOutlineRounded,
  'material-symbols:check-rounded': MsCheckRounded,
  'material-symbols:checklist-rounded': MsChecklistRounded,
  'material-symbols:close-rounded': MsCloseRounded,
  'material-symbols:colorize-rounded': MsColorizeRounded,
  'material-symbols:cloud-off-outline-rounded': MsCloudOffOutlineRounded,
  'material-symbols:code-rounded': MsCodeRounded,
  'material-symbols:database-outline': MsDatabaseOutline,
  'material-symbols:delete-outline-rounded': MsDeleteOutlineRounded,
  'material-symbols:description-outline-rounded': MsDescriptionOutlineRounded,
  'material-symbols:download-rounded': MsDownloadRounded,
  'material-symbols:drag-indicator': MsDragIndicator,
  'material-symbols:edit-outline-rounded': MsEditOutlineRounded,
  'material-symbols:error-outline-rounded': MsErrorOutlineRounded,
  'material-symbols:history-rounded': MsHistoryRounded,
  'material-symbols:hourglass-empty-rounded': MsHourglassEmptyRounded,
  'material-symbols:image-outline-rounded': MsImageOutlineRounded,
  'material-symbols:inbox-outline-rounded': MsInboxOutlineRounded,
  'material-symbols:info-outline-rounded': MsInfoOutlineRounded,
  'material-symbols:link-rounded': MsLinkRounded,
  'material-symbols:location-on-outline-rounded': MsLocationOnOutlineRounded,
  'material-symbols:lock-open-outline-rounded': MsLockOpenOutlineRounded,
  'material-symbols:merge-type-rounded': MsMergeTypeRounded,
  'material-symbols:monitor-heart-outline-rounded': MsMonitorHeartOutlineRounded,
  'material-symbols:notifications-outline-rounded': MsNotificationsOutlineRounded,
  'material-symbols:open-in-new-rounded': MsOpenInNewRounded,
  'material-symbols:partly-cloudy-day-outline-rounded': MsPartlyCloudyDayOutlineRounded,
  'material-symbols:public': MsPublic,
  'material-symbols:refresh-rounded': MsRefreshRounded,
  'material-symbols:rocket-launch-outline-rounded': MsRocketLaunchOutlineRounded,
  'material-symbols:rss-feed-rounded': MsRssFeedRounded,
  'material-symbols:schedule-outline-rounded': MsScheduleOutlineRounded,
  'material-symbols:skip-next-rounded': MsSkipNextRounded,
  'material-symbols:space-dashboard-outline-rounded': MsSpaceDashboardOutlineRounded,
  'material-symbols:sticky-note-2-outline-rounded': MsStickyNote2OutlineRounded,
  'material-symbols:swap-horiz-rounded': MsSwapHorizRounded,
  'material-symbols:timer-outline-rounded': MsTimerOutlineRounded,
  'material-symbols:tune-rounded': MsTuneRounded,
  'material-symbols:upload-rounded': MsUploadRounded,
  'material-symbols:wallpaper-rounded': MsWallpaperRounded,
  'material-symbols:warning-outline-rounded': MsWarningOutlineRounded,
  'material-symbols:waving-hand-outline-rounded': MsWavingHandOutlineRounded,
} satisfies Record<string, Component>;

export type IconName = keyof typeof ICONS;
