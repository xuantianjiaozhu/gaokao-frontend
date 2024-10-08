<script lang="ts" setup>
import { toPng } from 'html-to-image'
import { NAutoComplete, NButton, NInput, useDialog, useMessage } from 'naive-ui'
import { storeToRefs } from 'pinia'
import type { Ref } from 'vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from './components'
import HeaderComponent from './components/Header/index.vue'
import { useChat } from './hooks/useChat'
import { useScroll } from './hooks/useScroll'
import { useUsingContext } from './hooks/useUsingContext'
import { provinces, wenlis } from '@/utils/dict'
import { useChatStore, usePromptStore, useUserStore } from '@/store'
import { t } from '@/locales'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { HoverButton, SvgIcon } from '@/components/common'

let controller = new AbortController()

const route = useRoute()
const dialog = useDialog()
const ms = useMessage()

const chatStore = useChatStore()
const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)

const { isMobile } = useBasicLayout()
const {
  addChat,
  updateChat,
  updateChatSome,
  getChatByUuidAndIndex,
} = useChat()
const {
  scrollRef,
  scrollToBottom,
  scrollToBottomIfAtBottom,
} = useScroll()
const {
  usingContext,
} = useUsingContext()

const { uuid } = route.params as { uuid: string }

const dataSources = computed(() => chatStore.getChatByUuid(+uuid))
const conversationList = computed(() => dataSources.value.filter(item => (!item.inversion && !!item.conversationOptions)))

const prompt = ref<string>('')
const loading = ref<boolean>(false)
const inputRef = ref<Ref | null>(null)

// 添加PromptStore
const promptStore = usePromptStore()

// 使用storeToRefs，保证store修改后，联想部分能够重新渲染
const { promptList: promptTemplate } = storeToRefs<any>(promptStore)

// 未知原因刷新页面，loading 状态不会重置，手动重置
dataSources.value.forEach((item, index) => {
  if (item.loading)
    updateChatSome(+uuid, index, { loading: false })
})

function handleSubmit() {
  onConversation()
}

function getHistoryMessages(uuid: number) {
  const chatJson: string = localStorage.getItem('chatStorage') || '{}'
  const data = JSON.parse(chatJson)
  const messages: Chat.LlmMessage[] = []
  if (data.data?.chat) {
    data.data.chat.forEach((chatItem: any) => {
      if (chatItem.uuid === uuid) {
        chatItem.data.forEach((messageItem: any) => {
          const role = messageItem.inversion ? 'user' : 'assistant'
          const content: string = messageItem.text
          messages.push({
            role,
            content,
          })
        })
      }
    })
  }
  return messages.slice(-6, -2)
}

function parseDescription(description: string) {
  const parts = description.split(', ').map(part => part.trim())
  if (parts.length === 4) {
    const [provinceLabel, wenliLable, score, rank] = parts

    // Find the province value by label
    const foundProvince = provinces.find(p =>
      p.label.startsWith(provinceLabel), // As we truncated the label in description
    )
    const foundWenli = wenlis.find(wl => wl.label.startsWith(wenliLable))

    return {
      province: foundProvince?.label,
      wenli: foundWenli?.label,
      score,
      rank,
    }
  }
  return {}
}

function fetchLlmResponse(promptMessage: string, options: Chat.ConversationRequest) {
  let currentText = ''
  const { province, wenli, score, rank } = parseDescription(userInfo.value.description || '')

  fetch('/api/start-chat-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uuid,
      prompt: promptMessage,
      historyMessages: getHistoryMessages(+uuid),
      province,
      wenli,
      score,
      rank,
    }),
  })
    .then((response) => {
      if (!response.ok)
        return response.json().then(data => Promise.reject(data))
      return response.json()
    })
    .then((data) => {
      const eventSource = new EventSource(`/api/chat-process?uuid=${+uuid}`)
      eventSource.onmessage = function (event) {
        const { done, message } = JSON.parse(event.data)
        if (!done) {
          currentText += message
          updateChat(
            +uuid,
            dataSources.value.length - 1,
            {
              dateTime: new Date().toLocaleString(),
              text: currentText,
              inversion: false,
              error: false,
              loading: true,
              conversationOptions: {
                conversationId: data.conversationId,
                parentMessageId: data.id,
              },
              requestOptions: {
                prompt: promptMessage,
                options: { ...options },
              },
            },
          )
          scrollToBottomIfAtBottom()
        }
        else {
          eventSource.close()
        }
        updateChatSome(+uuid, dataSources.value.length - 1, { loading: false })
      }
      eventSource.onerror = function () {
        updateChat(
          +uuid,
          dataSources.value.length - 1,
          {
            dateTime: new Date().toLocaleString(),
            text: '服务器错误，请重试。',
            inversion: false,
            error: true,
            loading: false,
            conversationOptions: null,
            requestOptions: {
              prompt: promptMessage,
              options: { ...options },
            },
          },
        )
        scrollToBottomIfAtBottom()
        eventSource.close()
      }
    },
    )
    .catch((error: any) => {
      const errorMessage = error?.message ?? t('common.wrong')

      if (error.message === 'canceled') {
        updateChatSome(
          +uuid,
          dataSources.value.length - 1,
          {
            loading: false,
          },
        )
        scrollToBottomIfAtBottom()
        return
      }

      const currentChat = getChatByUuidAndIndex(+uuid, dataSources.value.length - 1)

      if (currentChat?.text && currentChat.text !== '') {
        updateChatSome(
          +uuid,
          dataSources.value.length - 1,
          {
            text: `${currentChat.text}\n[${errorMessage}]`,
            error: false,
            loading: false,
          },
        )
        return
      }

      updateChat(
        +uuid,
        dataSources.value.length - 1,
        {
          dateTime: new Date().toLocaleString(),
          text: errorMessage,
          inversion: false,
          error: true,
          loading: false,
          conversationOptions: null,
          requestOptions: {
            prompt: promptMessage,
            options: { ...options },
          },
        },
      )
      scrollToBottomIfAtBottom()
    })
    .finally(() => loading.value = false)
}

async function onConversation() {
  const promptMessage = prompt.value

  if (loading.value)
    return

  if (!promptMessage || promptMessage.trim() === '')
    return

  controller = new AbortController()

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: promptMessage,
      inversion: true,
      error: false,
      conversationOptions: null,
      requestOptions: {
        prompt: promptMessage,
        options: null,
      },
    },
  )
  scrollToBottom()

  loading.value = true
  prompt.value = ''

  let options: Chat.ConversationRequest = {}
  const lastContext = conversationList.value[conversationList.value.length - 1]?.conversationOptions

  if (lastContext && usingContext.value)
    options = { ...lastContext }

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: t('chat.thinking'),
      loading: true,
      inversion: false,
      error: false,
      conversationOptions: null,
      requestOptions: {
        prompt: promptMessage,
        options: { ...options },
      },
    },
  )
  scrollToBottom()

  fetchLlmResponse(promptMessage, options)
}

async function onRegenerate(index: number) {
  if (loading.value)
    return

  controller = new AbortController()

  const { requestOptions } = dataSources.value[index]

  const message = requestOptions?.prompt ?? ''

  let options: Chat.ConversationRequest = {}

  if (requestOptions.options)
    options = { ...requestOptions.options }

  loading.value = true

  updateChat(
    +uuid,
    index,
    {
      dateTime: new Date().toLocaleString(),
      text: t('chat.thinking'),
      inversion: false,
      error: false,
      loading: true,
      conversationOptions: null,
      requestOptions: {
        prompt: message,
        options: { ...options },
      },
    },
  )

  fetchLlmResponse(message, options)
}

function handleExport() {
  if (loading.value)
    return

  const d = dialog.warning({
    title: t('chat.exportImage'),
    content: t('chat.exportImageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: async () => {
      try {
        d.loading = true
        const ele = document.getElementById('image-wrapper')
        const imgUrl = await toPng(ele as HTMLDivElement)
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = imgUrl
        tempLink.setAttribute('download', 'chat-shot.png')
        if (typeof tempLink.download === 'undefined')
          tempLink.setAttribute('target', '_blank')

        document.body.appendChild(tempLink)
        tempLink.click()
        document.body.removeChild(tempLink)
        window.URL.revokeObjectURL(imgUrl)
        d.loading = false
        ms.success(t('chat.exportSuccess'))
        Promise.resolve()
      }
      catch (error: any) {
        ms.error(t('chat.exportFailed'))
      }
      finally {
        d.loading = false
      }
    },
  })
}

function handleDelete(index: number) {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.deleteMessage'),
    content: t('chat.deleteMessageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.deleteChatByUuid(+uuid, index)
    },
  })
}

function handleClear() {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.clearChat'),
    content: t('chat.clearChatConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.clearChatByUuid(+uuid)
    },
  })
}

function handleEnter(event: KeyboardEvent) {
  if (!isMobile.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
  else {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
}

function handleStop() {
  if (loading.value) {
    controller.abort()
    loading.value = false
  }
}

// 可优化部分
// 搜索选项计算，这里使用value作为索引项，所以当出现重复value时渲染异常(多项同时出现选中效果)
// 理想状态下其实应该是key作为索引项,但官方的renderOption会出现问题，所以就需要value反renderLabel实现
const searchOptions = computed(() => {
  if (prompt.value.startsWith('/')) {
    return promptTemplate.value.filter((item: {
      key: string
    }) => item.key.toLowerCase().includes(prompt.value.substring(1).toLowerCase())).map((obj: { value: any }) => {
      return {
        label: obj.value,
        value: obj.value,
      }
    })
  }
  else {
    return []
  }
})

// value反渲染key
const renderOption = (option: { label: string }) => {
  for (const i of promptTemplate.value) {
    if (i.value === option.label)
      return [i.key]
  }
  return []
}

const placeholder = computed(() => {
  if (isMobile.value)
    return t('chat.placeholderMobile')

  return t('chat.placeholder')
})

const buttonDisabled = computed(() => {
  return loading.value || !prompt.value || prompt.value.trim() === ''
})

const footerClass = computed(() => {
  let classes = ['p-4']
  if (isMobile.value)
    classes = ['sticky', 'left-0', 'bottom-0', 'right-0', 'p-2', 'pr-3', 'overflow-hidden']

  return classes
})

onMounted(() => {
  scrollToBottom()
  if (inputRef.value && !isMobile.value)
    inputRef.value?.focus()
})

onUnmounted(() => {
  if (loading.value)
    controller.abort()
})
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <HeaderComponent
      v-if="isMobile"
      :using-context="usingContext"
      @export="handleExport"
      @handle-clear="handleClear"
    />
    <main class="flex-1 overflow-hidden">
      <div id="scrollRef" ref="scrollRef" class="h-full overflow-hidden overflow-y-auto">
        <div
          :class="[isMobile ? 'p-2' : 'p-4']"
          class="w-full max-w-screen-xl m-auto dark:bg-[#101014]"
        >
          <div id="image-wrapper" class="relative">
            <template v-if="!dataSources.length">
              <div class="flex items-center justify-center mt-4 text-center text-neutral-500">
                <SvgIcon class="mr-2 text-cyan-500 text-8xl" icon="ri:bubble-chart-fill" />
                <span class="mr-2 text-sky-950 text-3xl">{{ t('chat.newChatTitle') }}</span>
              </div>
            </template>
            <template v-else>
              <div>
                <Message
                  v-for="(item, index) of dataSources"
                  :key="index"
                  :date-time="item.dateTime"
                  :error="item.error"
                  :inversion="item.inversion"
                  :loading="item.loading"
                  :text="item.text"
                  @delete="handleDelete(index)"
                  @regenerate="onRegenerate(index)"
                />
                <div class="sticky bottom-0 left-0 flex justify-center">
                  <NButton v-if="loading" type="warning" @click="handleStop">
                    <template #icon>
                      <SvgIcon icon="ri:stop-circle-line" />
                    </template>
                    {{ t('common.stopResponding') }}
                  </NButton>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </main>
    <footer :class="footerClass">
      <div class="w-full max-w-screen-xl m-auto">
        <div class="flex items-center justify-between space-x-2">
          <HoverButton v-if="!isMobile" @click="handleClear">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:delete-bin-line" />
            </span>
          </HoverButton>
          <HoverButton v-if="!isMobile" @click="handleExport">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:download-2-line" />
            </span>
          </HoverButton>
          <NAutoComplete v-model:value="prompt" :options="searchOptions" :render-label="renderOption">
            <template #default="{ handleInput, handleBlur, handleFocus }">
              <NInput
                ref="inputRef"
                v-model:value="prompt"
                :autosize="{ minRows: 1, maxRows: isMobile ? 4 : 8 }"
                :placeholder="placeholder"
                type="textarea"
                @blur="handleBlur"
                @focus="handleFocus"
                @input="handleInput"
                @keypress="handleEnter"
              />
            </template>
          </NAutoComplete>
          <NButton :disabled="buttonDisabled" type="primary" @click="handleSubmit">
            <template #icon>
              <span class="dark:text-black">
                <SvgIcon icon="ri:send-plane-fill" />
              </span>
            </template>
          </NButton>
        </div>
      </div>
    </footer>
  </div>
</template>
