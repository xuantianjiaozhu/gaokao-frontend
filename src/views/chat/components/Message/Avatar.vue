<script lang="ts" setup>
import { NAvatar } from 'naive-ui'
import defaultAvatar from '@/assets/avatar.svg'
import botAvatar from '@/assets/bot.svg'

interface Props {
  image?: boolean
}

defineProps<Props>()
</script>

<template>
  <template v-if="image">
    <NAvatar :src="defaultAvatar" round />
  </template>
  <template v-else>
    <NAvatar :src="botAvatar" round />
  </template>
</template>
