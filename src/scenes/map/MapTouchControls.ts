import { TOUCH_INPUT } from '../../utils/constants'

export function shouldShowMapTouchControls(
  deviceHasTouch: boolean,
  maxTouchPoints: number,
  matchesMediaQuery: (query: string) => boolean,
  viewportWidth: number,
): boolean {
  return deviceHasTouch
    || maxTouchPoints > 0
    || matchesMediaQuery(TOUCH_INPUT.DEVICE_MEDIA_QUERY)
    || viewportWidth <= TOUCH_INPUT.MOBILE_VIEWPORT_MAX_WIDTH
}
