<script lang="ts" setup>
import {Loading, Promotion, Refresh} from "@element-plus/icons-vue";

import {RequestChatParameters, ResponseChatMessage, TTSRecorder} from "@/network/SparkAPI";
import type {ApiConfigsType} from "@/components/ConfigSpark.vue"

import {getCurrentFormattedTime} from "@/tools/nowTime";
import {nanoid} from "nanoid";

// props
const props = defineProps<{
  api_config: ApiConfigsType;
}>()

// types
export type messagesType = ResponseChatMessage & {
  loading?: boolean;
  userName?: string;
  time?: string;
  text: string;
  requestError?: boolean;
}

// refs
const messagesList = defineModel<messagesType[]>('messagesList', {required: true})
const inputValue = defineModel<string>('inputValue', {required: true})
const submitLoading = defineModel<boolean>('submitLoading', {required: false, default: false})

// chat info
const userID = nanoid()
const chatID = ref<string>(nanoid())

function refreshMessages() {
  messagesList.value.length = messagesList.value[0]?.role === 'system' ? 1 : 0;
  chatID.value = nanoid() // 重新生成 chatID
}


function handleEnterKey(event: KeyboardEvent) {
  // todo: 或重建 el-input 以控制 enter 动作
  // 支持 ctrl + enter 换行
  if ((event.ctrlKey || event.shiftKey) && event.target instanceof HTMLTextAreaElement) {
    // 在当前光标位置插入一个新行字符
    const start = event.target.selectionStart;
    const end = event.target.selectionEnd;
    inputValue.value = inputValue.value.substring(0, start) + "\n" + inputValue.value.substring(end);
    // 将光标移动到插入的新行字符之后
    setTimeout(() => {
      if (event.target instanceof HTMLTextAreaElement) {
        event.target.selectionStart = event.target.selectionEnd = start + 1;
      }
    }, 0);
  } else {
    // 输入内容非空或全为\n
    if (inputValue.value.trim() !== '' && !inputValue.value.match(/^\n+$/)) {
      submitMessage()
    }
  }
}


async function submitMessage() {
  // 组装 content 并推送到 messagesList
  console.debug(`content: `, inputValue.value)
  messagesList.value.push({
    role: 'user',
    content: inputValue.value,
    text: inputValue.value,
    time: getCurrentFormattedTime(),
  })

  // 清理
  inputValue.value = ''

  // 开始请求
  submitLoading.value = true

  // clone messagesList
  const messagesWithoutPlaceholder = messagesList.value.map(({role, content}) => {
    return {role: role, content: content}
  });

  // 添加占位符到 messagesList
  const placeholderIndex = messagesList.value.push({content: '', role: 'assistant', loading: true, text: ""}) - 1;

  // 执行请求，使用不包含占位符的副本
  const {APP_ID, API_Secret, API_KEY, API_URL, API_Domain, max_tokens, temperature, top_k} = props.api_config;
  const SparkChatParams: RequestChatParameters = {
    max_tokens: max_tokens,
    temperature: temperature,
    top_k: top_k,
  }

  const tts = new TTSRecorder( APP_ID, API_Secret, API_KEY, userID )
  tts.onMessage = (message: string) => {
    console.debug("Response message: ", message)
    messagesList.value[placeholderIndex].text += message
    messagesList.value[placeholderIndex].loading = false
  }

  tts.onFinish = (totalResult: string) => {
    console.debug("Total response: ", totalResult)
    messagesList.value[placeholderIndex].text = totalResult
    messagesList.value[placeholderIndex].content = totalResult

    // 无论成功还是失败，都需要停止加载状态
    submitLoading.value = false
    messagesList.value[placeholderIndex].loading = false
  }

  // start requests
  try {
    tts.connectWebSocket(messagesWithoutPlaceholder, API_URL, API_Domain, SparkChatParams, chatID.value)
  } catch (err) {
    console.error("Error submitting message:", err);
    messagesList.value[placeholderIndex].requestError = true
  }
}
</script>

<template>
  <div class="rowTools">
    <div />
    <el-button class="refreshBtn" link size="large" type="info" @click="refreshMessages">
      New Chat
      <el-icon style="margin-left: 5px">
        <Refresh style="transform: scale(1.2);"/>
      </el-icon>
    </el-button>
  </div>
  <div class="rowInput">
    <el-input v-model="inputValue" :autosize="{ minRows: 1, maxRows: 8 }" autofocus
              class="inputText" maxlength="4000"
              placeholder="Please type here" type="textarea" @keyup.enter.native="handleEnterKey"
    />
    <el-button :disabled="!(inputValue.length > 0) || submitLoading" class="submitBtn" @click="submitMessage">
      <el-icon v-show="!submitLoading" size="17">
        <Promotion/>
      </el-icon>
      <el-icon v-show="submitLoading" class="is-loading" size="17">
        <Loading/>
      </el-icon>
    </el-button>
  </div>
</template>

<style lang="scss" scoped>
.filePreview {
  min-width: 200px;
  width: 100%;
  max-width: 770px;

  flex-grow: 1;
  flex-basis: 80px;
}

.rowTools {
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  margin: 0 5px 0 5px;

  min-width: 200px;
  width: 100%;
  max-width: 770px;

  .uploadBtn {
    font-size: 15px;
  }

  .refreshBtn {
    font-size: 15px;
  }
}

.rowInput {
  margin-top: 10px;

  border: 1px solid var(--el-box-shadow);
  box-shadow: var(--el-box-shadow);

  border-radius: 10px;

  display: flex;
  flex-direction: row;
  align-items: end;

  padding: 10px;

  min-width: 200px;
  width: 100%;
  max-width: 770px;

  .inputText {
    :deep(.el-textarea__inner) {
      border-radius: 10px;
      resize: none;
      border: none;
      font-size: 16px;
      font-weight: 400;
      box-shadow: none;
    }
  }

  .submitBtn {
    height: 34px;
    margin: 0 0 0 5px;
    border-radius: 10px;
  }
}
</style>