<script lang="ts" setup>
import { NButton, NInput, NPopconfirm, NSelect, useMessage } from 'naive-ui'
import { computed, onMounted, ref, watch } from 'vue'
import { SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { useAppStore, useUserStore } from '@/store'
import type { Theme } from '@/store/modules/app/helper'
import type { UserInfo } from '@/store/modules/user/helper'
import { getCurrentDate } from '@/utils/functions'
import { provinces, wenlis } from '@/utils/dict'

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

const onlyAllowNumber = (value: string) => !value || /^\d+$/.test(value)

const selectedProvince = ref('')
const selectedWenli = ref('')
const firstNumber = ref('')
const secondNumber = ref('')

const description = computed(() => {
  // selectedProvince.value 映射到 label
  let province = ''
  provinces.forEach((p) => {
    if (p.value === selectedProvince.value)
      province = p.label
  })
  if (province.length === 4 || province.length === 6)
    province = province.substring(0, 3)
  else
    province = province.substring(0, 2)

  let wenli = ''
  wenlis.forEach((wl) => {
    if (wl.value === selectedWenli.value)
      wenli = wl.label.at(0) || ''
  })
  const score = firstNumber.value || ''
  const rank = secondNumber.value || ''
  return `${province}, ${wenli}, ${score}, ${rank}`
})

const parseDescription = (description: string) => {
  const parts = description.split(', ').map(part => part.trim())
  if (parts.length === 4) {
    const [provinceLabel, wenliLable, score, rank] = parts

    // Find the province value by label
    const foundProvince = provinces.find(p =>
      p.label.startsWith(provinceLabel), // As we truncated the label in description
    )
    const foundWenli = wenlis.find(wl => wl.label === wenliLable)

    if (foundProvince)
      selectedProvince.value = foundProvince.value
    if (foundWenli)
      selectedWenli.value = foundWenli.value

    firstNumber.value = score
    secondNumber.value = rank
  }
}

watch(() => userInfo.value.description, (newDescription) => {
  parseDescription(newDescription)
})

onMounted(() => {
  if (userInfo.value.description)
    parseDescription(userInfo.value.description)
})

const isFormComplete = computed(() => {
  return selectedProvince.value && selectedWenli.value && firstNumber.value && secondNumber.value
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
              style="width: 35%; margin-right: 10px;"
            />
            <NSelect
              v-model:value="selectedWenli"
              :options="wenlis"
              placeholder="文理"
              style="width: 20%; margin-right: 10px;"
            />
            <NInput
              v-model:value="firstNumber"
              :allow-input="onlyAllowNumber"
              placeholder="分数"
              style="width: 20%; margin-right: 10px;"
            />
            <NInput
              v-model:value="secondNumber"
              :allow-input="onlyAllowNumber"
              placeholder="位次"
              style="width: 20%;"
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
