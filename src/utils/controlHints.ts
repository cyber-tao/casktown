export interface FacilityControlHints {
  action: string
  back: string
}

export function getFacilityControlHints(
  getActionName: (action: 'up' | 'down' | 'confirm' | 'cancel') => string,
  actionLabel: string,
): FacilityControlHints {
  return {
    action: `${getActionName('up')}/${getActionName('down')} 选择 | ${getActionName('confirm')} ${actionLabel}`,
    back: `${getActionName('cancel')} 返回`,
  }
}
