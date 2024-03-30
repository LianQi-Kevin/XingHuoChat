<script lang="ts" setup>
import {DocumentAdd, Loading, Promotion, Refresh} from "@element-plus/icons-vue";
import {isNil} from "lodash-es";

import type {FilePreviewRaw} from "@/components/FilePreview.vue";
import FilePreview from "@/components/FilePreview.vue";
import type {openaiFileResponseObject} from "@/types/OpenaiAPI";
import type {ChatMessagesList} from "@/types/ChatComponents";
import type {ApiConfigsType} from "@/components/ConfigOpenai.vue"
import type {UploadInstance, UploadProgressEvent, UploadRequestOptions} from "element-plus";

import {getBase64} from "@/tools/base64";
import {convertUnixTimeToFormattedTime, getCurrentFormattedTime} from "@/tools/nowTime";
import {createChatCompletion} from "@/network/OpenaiApi";
import {createMessageContent} from "@/tools/QwenVisual";
import {Stream} from "openai/streaming";

// props
const props = defineProps<{
  api_config: ApiConfigsType;
  modelName: string
}>()

// refs
const messagesList = defineModel<ChatMessagesList[]>('messagesList', {required: true})
const inputValue = defineModel<string>('inputValue', {required: true})
const uploadFileList = defineModel<FilePreviewRaw[]>('uploadFileList', {required: true})
const submitLoading = defineModel<boolean>('submitLoading', {required: false, default: false})

const uploadRef = ref<UploadInstance>()

function removeUploadItem(index: number, xhr?: XMLHttpRequest) {
  uploadFileList.value.splice(index, 1)
  xhr?.abort()
}

function refreshMessages() {
  messagesList.value.length = messagesList.value[0]?.role === 'system' ? 1 : 0
  uploadFileList.value.length = 0
  uploadRef.value?.clearFiles()
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
  const content = await createMessageContent(inputValue.value, uploadFileList.value)
  console.debug(`content: `, content)
  messagesList.value.push({
    role: 'user',
    content: content,
    text: inputValue.value,
    fileList: [...uploadFileList.value],
    time: getCurrentFormattedTime()
  })

  // 清理
  uploadFileList.value.length = 0
  uploadRef.value?.clearFiles()
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
  const {API_URL, API_KEY, ...openaiParams} = props.api_config;
  createChatCompletion(
    API_URL,
    messagesWithoutPlaceholder,
    props.modelName,
    API_KEY,
    openaiParams
  ).then(async response => {
    const placeholder = messagesList.value[placeholderIndex];
    if (response instanceof Stream) {
      placeholder.time = getCurrentFormattedTime();
      for await (const chunk of response) {
        console.log(chunk.choices[0]?.delta?.content || '');
        placeholder.content += chunk.choices[0]?.delta?.content || '';
        placeholder.text += chunk.choices[0]?.delta?.content || '';
        console.debug("response chunk:", chunk.choices[0]?.delta?.content)
      }
    } else {
      console.debug("response:", response?.choices[0]?.message?.content)
      placeholder.time = convertUnixTimeToFormattedTime(response?.created);
      placeholder.content = response?.choices[0]?.message?.content ?? "Error: No response";
      placeholder.text = response?.choices[0]?.message?.content ?? "Error: No response";
    }
  }).catch(error => {
    console.error("Error submitting message:", error);
    // 错误处理，可以选择更新占位符显示错误信息或移除占位符
    messagesList.value[placeholderIndex].requestError = true
  }).finally(() => {
    // 无论成功还是失败，都需要停止加载状态
    messagesList.value[placeholderIndex].loading = false
    submitLoading.value = false
  });
}


/**
 * 使用 uid 从 uploadFileList 中查找项目
 */
function findItemByUid(uid: number): FilePreviewRaw | undefined {
  return uploadFileList.value.find(item => item.uid === uid);
}

/**
 * 检查 xhr response 并尝试格式化
 *
 * @param {XMLHttpRequest} xhr - The XMLHttpRequest object whose response body is to be parsed.
 * @returns {XMLHttpRequestResponseType} - The parsed response body, or the original text if parsing fails.
 */
function getBody(xhr: XMLHttpRequest): XMLHttpRequestResponseType {
  const text = xhr.responseText || xhr.response
  if (!text) {
    return text
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * 适配 el-upload 的 xhr请求对象，用于上传文件
 *
 * @param {UploadRequestOptions} option - The options for the upload request, including the file to be uploaded.
 * @returns {Promise<XMLHttpRequest>} - A Promise that resolves with the XMLHttpRequest object used for the upload.
 */
async function ajaxUpload(option: UploadRequestOptions): Promise<XMLHttpRequest> {
  // 锁定 submit btn 状态
  submitLoading.value = true

  // 构建请求
  const xhr = new XMLHttpRequest();

  const url = new URL(props.api_config.API_URL)
  url.pathname = "/v1/files"

  const action: string = url.toString() // 请求URL

  // 进度
  if (xhr.upload) {
    xhr.upload.addEventListener('progress', (evt: ProgressEvent) => {
      const progressEvt = evt as UploadProgressEvent
      progressEvt.percent = evt.total > 0 ? (evt.loaded / evt.total) * 100 : 0
      console.debug('progressEvt:', progressEvt)
      const fileItem = findItemByUid(option.file.uid);
      if (fileItem) {
        // 更新该文件的上传进度
        fileItem.progress = Math.trunc(progressEvt.percent);
      }
    })
  }

  // 构建发送数据
  const formData = new FormData()
  formData.append('file', option.file)
  formData.append('purpose', 'assistants')

  // 推送基本内容
  uploadFileList.value.push({
    raw: option.file,
    uid: option.file.uid,
    b64: (option.file.type.includes('image')) ? await getBase64(option.file) : undefined,
    progress: 0,
    xhr: xhr
  })

  xhr.addEventListener('error', () => {
    // 发送请求失败
    const fileItem = findItemByUid(option.file.uid);
    if (fileItem) {
      fileItem.status = 'exception';
    }
  })

  xhr.addEventListener('load', () => {
    // 发送请求成功
    const fileItem = findItemByUid(option.file.uid);
    if (fileItem) {
      // 更新上传状态
      fileItem.status = xhr.status < 200 || xhr.status >= 300 ? 'exception' : 'success';
      if (fileItem.status === 'success') {
        fileItem.progress = 100;
        const response = getBody(xhr) as unknown as openaiFileResponseObject;
        fileItem.url = `${action}/${response.id}/content`;
      }
    }
  })

  xhr.addEventListener('loadend', () => {
    // 解锁 submit btn 状态
    submitLoading.value = false
  })

  // 创建请求
  xhr.open(option.method, action, true)

  // 构建请求头
  const headers = option.headers || {}
  if (headers instanceof Headers) {
    headers.forEach((value, key) => xhr.setRequestHeader(key, value))
  } else {
    for (const [key, value] of Object.entries(headers)) {
      if (isNil(value)) continue
      xhr.setRequestHeader(key, String(value))
    }
  }

  xhr.send(formData)
  return xhr
}

// 更新 el-upload 的 accept
const accept_type = ref<string>('.jpg, .jpeg, .png, .webp, .bmp')
watch(props.api_config, () => {
  if (!(props.api_config.VL || props.api_config.langchain)) return
  if (props.api_config.VL) {
    accept_type.value = '.jpg, .jpeg, .png, .webp, .bmp'
  }
  if (props.api_config.langchain) {
    accept_type.value = '*'
  }
})
</script>

<template>
  <FilePreview v-if="uploadFileList.length" :file-list="uploadFileList" class="filePreview"
               show-remove @removeBtnClick="removeUploadItem"/>
  <div class="rowTools">
    <el-upload ref="uploadRef" :accept="accept_type" :auto-upload="true" v-if="api_config.VL || api_config.langchain"
               :http-request="ajaxUpload" :limit="10" :multiple="true" :show-file-list="false"
               action="#" class="uploadMain" method="post" >
      <el-button class="uploadBtn" link size="large" type="info">
        Select Files
        <el-icon style="margin-left: 5px">
          <DocumentAdd style="transform: scale(1.2);"/>
        </el-icon>
      </el-button>
    </el-upload>
    <div v-else/>
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