<script lang="ts" setup>
import { NButton, NInput, NPopconfirm, NSelect, useMessage } from 'naive-ui'
import { computed, ref } from 'vue'
import { SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { useAppStore, useUserStore } from '@/store'
import type { Theme } from '@/store/modules/app/helper'
import type { UserInfo } from '@/store/modules/user/helper'
import { getCurrentDate } from '@/utils/functions'

const appStore = useAppStore()
const userStore = useUserStore()

const { isMobile } = useBasicLayout()

const ms = useMessage()

const theme = computed(() => appStore.theme)

const userInfo = computed(() => userStore.userInfo)

const name = ref(userInfo.value.name ?? '')

const themeOptions: { label: string; key: Theme; icon: string }[] = [
  {
    label: 'Auto',
    key: 'auto',
    icon: 'ri:contrast-line',
  },
  {
    label: 'Light',
    key: 'light',
    icon: 'ri:sun-foggy-line',
  },
  {
    label: 'Dark',
    key: 'dark',
    icon: 'ri:moon-foggy-line',
  },
]

function updateUserInfo(options: Partial<UserInfo>) {
  userStore.updateUserInfo(options)
  ms.success(t('common.success'))
}

function handleReset() {
  userStore.resetUserInfo()
  ms.success(t('common.success'))
  window.location.reload()
}

function exportData(): void {
  const date = getCurrentDate()
  const data: string = localStorage.getItem('chatStorage') || '{}'
  const jsonString: string = JSON.stringify(JSON.parse(data), null, 2)
  const blob: Blob = new Blob([jsonString], { type: 'application/json' })
  const url: string = URL.createObjectURL(blob)
  const link: HTMLAnchorElement = document.createElement('a')
  link.href = url
  link.download = `chat-store_${date}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function importData(event: Event): void {
  const target = event.target as HTMLInputElement
  if (!target || !target.files)
    return

  const file: File = target.files[0]
  if (!file)
    return

  const reader: FileReader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string)
      localStorage.setItem('chatStorage', JSON.stringify(data))
      ms.success(t('common.success'))
      location.reload()
    }
    catch (error) {
      ms.error(t('common.invalidFileFormat'))
    }
  }
  reader.readAsText(file)
}

function clearData(): void {
  localStorage.removeItem('chatStorage')
  location.reload()
}

function handleImportButtonClick(): void {
  const fileInput = document.getElementById('fileInput') as HTMLElement
  if (fileInput)
    fileInput.click()
}

const provinces = [
  {
    label: '北京市',
    key: 'Beijing',
    value: 'Beijing',
  },
  {
    label: '天津市',
    key: 'Tianjin',
    value: 'Tianjin',
  },
  {
    label: '河北省',
    key: 'Hebei',
    value: 'Hebei',
  },
  {
    label: '山西省',
    key: 'Shanxi',
    value: 'Shanxi',
  },
  {
    label: '内蒙古自治区',
    key: 'Neimenggu',
    value: 'Neimenggu',
  },
  {
    label: '辽宁省',
    key: 'Liaoning',
    value: 'Liaoning',
  },
  {
    label: '吉林省',
    key: 'Jilin',
    value: 'Jilin',
  },
  {
    label: '黑龙江省',
    key: 'Heilongjiang',
    value: 'Heilongjiang',
  },
  {
    label: '上海市',
    key: 'Shanghai',
    value: 'Shanghai',
  },
  {
    label: '江苏省',
    key: 'Jiangsu',
    value: 'Jiangsu',
  },
  {
    label: '浙江省',
    key: 'Zhejiang',
    value: 'Zhejiang',
  },
  {
    label: '安徽省',
    key: 'Anhui',
    value: 'Anhui',
  },
  {
    label: '福建省',
    key: 'Fujian',
    value: 'Fujian',
  },
  {
    label: '江西省',
    key: 'Jiangxi',
    value: 'Jiangxi',
  },
  {
    label: '山东省',
    key: 'Shandong',
    value: 'Shandong',
  },
  {
    label: '河南省',
    key: 'Henan',
    value: 'Henan',
  },
  {
    label: '湖北省',
    key: 'Hubei',
    value: 'Hubei',
  },
  {
    label: '湖南省',
    key: 'Hunan',
    value: 'Hunan',
  },
  {
    label: '广东省',
    key: 'Guangdong',
    value: 'Guangdong',
  },
  {
    label: '广西壮族自治区',
    key: 'Guangxi',
    value: 'Guangxi',
  },
  {
    label: '海南省',
    key: 'Hainan',
    value: 'Hainan',
  },
  {
    label: '重庆市',
    key: 'Chongqing',
    value: 'Chongqing',
  },
  {
    label: '四川省',
    key: 'Sichuan',
    value: 'Sichuan',
  },
  {
    label: '贵州省',
    key: 'Guizhou',
    value: 'Guizhou',
  },
  {
    label: '云南省',
    key: 'Yunnan',
    value: 'Yunnan',
  },
  {
    label: '西藏自治区',
    key: 'Xizang',
    value: 'Xizang',
  },
  {
    label: '陕西省',
    key: 'Shaanxi',
    value: 'Shaanxi',
  },
  {
    label: '甘肃省',
    key: 'Gansu',
    value: 'Gansu',
  },
  {
    label: '青海省',
    key: 'Qinghai',
    value: 'Qinghai',
  },
  {
    label: '宁夏回族自治区',
    key: 'Ningxia',
    value: 'Ningxia',
  },
  {
    label: '新疆维吾尔自治区',
    key: 'Xinjiang',
    value: 'Xinjiang',
  },
]

const onlyAllowNumber = (value: string) => !value || /^\d+$/.test(value)

const selectedProvince = ref('')
const firstNumber = ref('')
const secondNumber = ref('')

// const description = ref(userInfo.value.description ?? '')
const description = computed(() => {
  // selectedProvince.value 映射到 label
  let province = ''
  provinces.forEach((p) => {
    if (p.value === selectedProvince.value)
      province = p.label
  })
  const score = firstNumber.value || ''
  const rank = secondNumber.value || ''
  return `${province}, ${score}, ${rank}`
})

const isFormComplete = computed(() => {
  return selectedProvince.value && firstNumber.value && secondNumber.value
})
</script>

<template>
  <div class="p-4 space-y-5 min-h-[200px]">
    <div class="space-y-6">
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[100px]">{{ $t('setting.name') }}</span>
        <div class="w-[200px]">
          <NInput v-model:value="name" placeholder="" />
        </div>
        <NButton size="tiny" text type="primary" @click="updateUserInfo({ name })">
          {{ $t('common.save') }}
        </NButton>
      </div>
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[100px]">{{ $t('setting.description') }}</span>
        <div class="flex-1">
          <div class="flex flex-wrap">
            <NSelect
              v-model:value="selectedProvince"
              :options="provinces"
              placeholder="省份"
              style="width: 40%; margin-right: 10px;"
            />
            <NInput
              v-model:value="firstNumber"
              :allow-input="onlyAllowNumber"
              placeholder="分数"
              style="width: 25%; margin-right: 10px;"
            />
            <NInput
              v-model:value="secondNumber"
              :allow-input="onlyAllowNumber"
              placeholder="位次"
              style="width: 25%;"
            />
          </div>
        </div>
        <NButton :disabled="!isFormComplete" size="tiny" text type="primary" @click="updateUserInfo({ description })">
          {{ $t('common.save') }}
        </NButton>
      </div>
      <div
        :class="isMobile && 'items-start'"
        class="flex items-center space-x-4"
      >
        <span class="flex-shrink-0 w-[100px]">{{ $t('setting.chatHistory') }}</span>

        <div class="flex flex-wrap items-center gap-4">
          <NButton size="small" @click="exportData">
            <template #icon>
              <SvgIcon icon="ri:download-2-fill" />
            </template>
            {{ $t('common.export') }}
          </NButton>

          <input id="fileInput" style="display:none" type="file" @change="importData">
          <NButton size="small" @click="handleImportButtonClick">
            <template #icon>
              <SvgIcon icon="ri:upload-2-fill" />
            </template>
            {{ $t('common.import') }}
          </NButton>

          <NPopconfirm placement="bottom" @positive-click="clearData">
            <template #trigger>
              <NButton size="small">
                <template #icon>
                  <SvgIcon icon="ri:close-circle-line" />
                </template>
                {{ $t('common.clear') }}
              </NButton>
            </template>
            {{ $t('chat.clearHistoryConfirm') }}
          </NPopconfirm>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[100px]">{{ $t('setting.theme') }}</span>
        <div class="flex flex-wrap items-center gap-4">
          <template v-for="item of themeOptions" :key="item.key">
            <NButton
              :type="item.key === theme ? 'primary' : undefined"
              size="small"
              @click="appStore.setTheme(item.key)"
            >
              <template #icon>
                <SvgIcon :icon="item.icon" />
              </template>
            </NButton>
          </template>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[100px]">{{ $t('setting.resetUserInfo') }}</span>
        <NButton size="small" @click="handleReset">
          {{ $t('common.reset') }}
        </NButton>
      </div>
    </div>
  </div>
</template>
