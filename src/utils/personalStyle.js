export const DEFAULT_PERSONAL_STYLE = {
  themeColorStart: '#38bdf8',
  themeColorEnd: '#818cf8',
  themeOpacity: 0.08,
  profileBackground: '',
  welcomeBackground: ''
}

export function normalizePersonalStyle(user = {}) {
  // 后端老用户可能没有个性化字段，这里统一补默认值，页面就不会出现空颜色。
  return {
    themeColorStart: user.theme_color_start || DEFAULT_PERSONAL_STYLE.themeColorStart,
    themeColorEnd: user.theme_color_end || DEFAULT_PERSONAL_STYLE.themeColorEnd,
    themeOpacity: Number.isFinite(Number(user.theme_opacity))
      ? Number(user.theme_opacity)
      : DEFAULT_PERSONAL_STYLE.themeOpacity,
    profileBackground: user.profile_background || '',
    // 欢迎页背景必须和主页背景独立；没有单独设置时保持空值，让页面显示黑色默认背景。
    welcomeBackground: user.welcome_background || ''
  }
}

export function personalCssVars(user = {}) {
  const style = normalizePersonalStyle(user)
  return {
    '--sunshine-theme-start': style.themeColorStart,
    '--sunshine-theme-end': style.themeColorEnd,
    '--sunshine-bg-opacity': String(style.themeOpacity),
    '--sunshine-bg-blur': `${Math.round(style.themeOpacity * 30)}px`
  }
}

export function personalBackgroundStyle(user = {}, options = {}) {
  const style = normalizePersonalStyle(user)
  const background = options.target === 'welcome' ? style.welcomeBackground : style.profileBackground
  return {
    ...personalCssVars(user),
    // 背景图为空时不设置 url，让页面继续使用原来的纯色背景。
    '--sunshine-page-bg': background ? `url("${background}")` : 'none'
  }
}
