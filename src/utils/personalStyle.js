export const DEFAULT_PERSONAL_STYLE = {
  themeColorStart: '#38bdf8',
  themeColorEnd: '#818cf8',
  themeOpacity: 0.28,
  profileBackground: ''
}

export function normalizePersonalStyle(user = {}) {
  // 后端老用户可能没有个性化字段，这里统一补默认值，页面就不会出现空颜色。
  return {
    themeColorStart: user.theme_color_start || DEFAULT_PERSONAL_STYLE.themeColorStart,
    themeColorEnd: user.theme_color_end || DEFAULT_PERSONAL_STYLE.themeColorEnd,
    themeOpacity: Number.isFinite(Number(user.theme_opacity))
      ? Number(user.theme_opacity)
      : DEFAULT_PERSONAL_STYLE.themeOpacity,
    profileBackground: user.profile_background || ''
  }
}

export function personalCssVars(user = {}) {
  const style = normalizePersonalStyle(user)
  return {
    '--sunshine-theme-start': style.themeColorStart,
    '--sunshine-theme-end': style.themeColorEnd,
    '--sunshine-bg-opacity': String(style.themeOpacity)
  }
}

export function personalBackgroundStyle(user = {}) {
  const style = normalizePersonalStyle(user)
  return {
    ...personalCssVars(user),
    // 背景图为空时不设置 url，让页面继续使用原来的纯色背景。
    '--sunshine-page-bg': style.profileBackground ? `url("${style.profileBackground}")` : 'none'
  }
}
