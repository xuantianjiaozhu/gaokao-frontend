import type { App } from 'vue'
import { createI18n } from 'vue-i18n'
import enUS from './en-US'
import esES from './es-ES'
import koKR from './ko-KR'
import ruRU from './ru-RU'
import viVN from './vi-VN'
import zhCN from './zh-CN'
import zhTW from './zh-TW'
import type { Language } from '@/store/modules/app/helper'

const defaultLocale = 'zh-CN'

const i18n = createI18n({
  locale: defaultLocale,
  fallbackLocale: 'zh-CN',
  allowComposition: true,
  messages: {
    'en-US': enUS,
    'es-ES': esES,
    'ko-KR': koKR,
    'ru-RU': ruRU,
    'vi-VN': viVN,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
  },
})

export const t = i18n.global.t

export function setLocale(locale: Language) {
  i18n.global.locale = 'zh-CN'
}

export function setupI18n(app: App) {
  app.use(i18n)
}

export default i18n
