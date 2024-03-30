<script lang="ts" setup>
import {Tools} from "@element-plus/icons-vue";

import type {ApiConfigsType} from "@/components/ConfigOpenai.vue"
import ConfigOpenai from "@/components/ConfigOpenai.vue";
import ChatCard from "@/components/ChatCard.vue"
import InputArea from "@/components/InputArea.vue";
import type {FilePreviewRaw} from "@/components/FilePreview.vue";
import type {ChatMessagesList} from "@/types/ChatComponents";

import {listModels} from "@/network/OpenaiApi"
import DB from "@/tools/db";


const modelName = ref<string>('');
const modelList = reactive<{ label: string; value: string }[]>([]);
const showConfig = ref<boolean>(false);
const apiConfigs = reactive<ApiConfigsType>({
  API_URL: "",
  displayModels: true
});
const OpenaiAPI_DB = new DB("ApiKeys", "Openai");

// 获取模型列表
onMounted(() => {
  nextTick(async () => {
    // 检查数据库内是否存在已保存数据，更新全局变量
    const api_config = await OpenaiAPI_DB.getItem("apiConfigs") as ApiConfigsType
    if (!api_config) {
      ElMessage.warning(
        "Please type the API URL & API KEY"
      )
      showConfig.value = true
    } else {
      Object.assign(apiConfigs, api_config)

      // 获取模型列表
      if (apiConfigs) {
        refreshModelList()
      } else {
        // 未获取到模型列表时，弹出配置框
        showConfig.value = true
      }
    }
  });
});

function configOnSubmit(_apiConfigs: ApiConfigsType) {
  // 更新全局变量
  Object.assign(apiConfigs, _apiConfigs)
  refreshModelList()
}

function refreshModelList() {
  // 清空模型列表
  modelList.length = 0

  // 获取模型列表
  listModels(apiConfigs.API_URL).then(data => {
    data.data.map(model => model.id).map(item => {
      modelList.push({label: item.split('/')[1], value: item})
    })
    modelName.value = modelList[0]?.value
  }).catch(() => {
    ElMessage.error("Failed to get model list")
    showConfig.value = true
  })
}


// PromptArea
const inputValue = ref<string>('');
const messagesList = ref<ChatMessagesList[]>([]);
const uploadFileList = ref<FilePreviewRaw[]>([])

// messagesList 更新时滚动页面到底部
watch(messagesList, () => {
  const chatCard = document.querySelector('.conversations')
  if (chatCard) {
    chatCard.scrollTop = chatCard.scrollHeight
  }
}, {deep: true, flush: 'post'})
</script>

<template>
  <div class="content">
    <ConfigOpenai v-model:visible="showConfig" @onSubmit="configOnSubmit"/>
    <div class="main">
      <div class="header">
        <el-select v-if="apiConfigs.displayModels && modelList.length > 1" v-model="modelName" placeholder="Model"
                   style="max-width: 300px">
          <el-option v-for="item in modelList" :key="item.label" :label="item.label" :value="item.value"/>
        </el-select>
        <el-text v-else-if="apiConfigs.displayModels && modelList.length == 1" class="modelName" size="large">
          {{ modelList[0]?.label }}
        </el-text>
        <div v-else/>
        <el-button @click="showConfig = true">
          <el-icon size="16">
            <Tools/>
          </el-icon>
        </el-button>
      </div>
      <div class="conversations">
        <template v-for="{role, userName, loading, text, fileList, requestError, time} in messagesList">
          <ChatCard :file-list="fileList" :loading="loading" :request-error="requestError" :role="role"
                    :text="text" :time="time" :user-name="userName"/>
        </template>
      </div>
      <div class="inputArea">
        <InputArea
          v-model:input-value="inputValue"
          v-model:messages-list="messagesList"
          v-model:upload-file-list="uploadFileList"
          :api_config="apiConfigs"
          :model-name="modelName"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
// 覆盖全局滚动条样式（仿 el-scrollbar）
::-webkit-scrollbar {
  width: 7px;
}

::-webkit-scrollbar:horizontal {
  height: 10px;
}

::-webkit-scrollbar-track {
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background-color: var(--el-scrollbar-bg-color, var(--el-text-color-secondary));
  border-radius: 10px;
  transition: all 0.2s ease-in-out;
}
</style>

<style lang="scss" scoped>
.content {
  width: 100%;
  height: 100vh;

  display: flex;
  flex-direction: row;

  .main {
    display: flex;
    flex-direction: column;
    flex-grow: 1;

    .header {
      padding: 8px 20px;
      display: flex;
      flex-direction: row;
      justify-content: space-between;

      margin: 0 auto;
      flex-grow: 0;

      min-width: 200px;
      width: 100%;

      :deep(.el-select__wrapper), .modelName {
        box-shadow: none;
        //max-width: 200px;
        font-size: 18px;
        font-weight: 500;
      }

      .modelName {
        padding-left: 15px;
      }
    }

    .conversations {
      width: 100%;
      flex-grow: 1;

      overflow-y: auto;
      overflow-x: hidden;

      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .inputArea {
      margin: 10px 15px 15px 15px;

      flex-basis: 80px;

      display: flex;
      flex-direction: column;
      align-items: center;

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
    }
  }

  @media screen and (max-width: 770px) {
    .main {
      .header {
        padding: 8px;

        .modelName {
          padding-left: 5px;
        }
      }
    }
  }
}
</style>