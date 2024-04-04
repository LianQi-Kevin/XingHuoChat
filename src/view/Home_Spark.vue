<script lang="ts" setup>
import {Tools} from "@element-plus/icons-vue";

import type {ApiConfigsType} from "@/components/ConfigSpark.vue"
import ChatCard from "@/components/ChatCard.vue"
import InputArea_Spark from "@/components/InputArea_Spark.vue";
import type {messagesType} from "@/components/InputArea_Spark.vue";

import DB from "@/tools/db";


const modelName = ref<string>('');
const modelList = reactive<{ label: string; value: string }[]>([{label: "讯飞星火认知大模型", value: "Spark"}]);
const showConfig = ref<boolean>(false);
const apiConfigs = reactive<ApiConfigsType>({
  API_URL: "",
  API_KEY: "",
  APP_ID: "",
  API_Secret: "",
  displayModels: true
});
const SparkAPI_DB = new DB("ApiKeys", "Spark");

// 获取模型列表
onMounted(() => {
  nextTick(async () => {
    // 检查数据库内是否存在已保存数据，更新全局变量
    // const api_config = await OpenaiAPI_DB.getItem("apiConfigs") as ApiConfigsType
    const api_config = await SparkAPI_DB.getItem("apiConfigs") as ApiConfigsType
    if (!api_config) {
      ElMessage.warning(
        "Please type the API URL & API KEY"
      )
      showConfig.value = true
    } else {
      Object.assign(apiConfigs, api_config)
    }
  });
});

function configOnSubmit(_apiConfigs: ApiConfigsType) {
  // 更新全局变量
  Object.assign(apiConfigs, _apiConfigs)
}


// PromptArea
const inputValue = ref<string>('');
const messagesList = ref<messagesType[]>([]);

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
<!--    <ConfigOpenai v-model:visible="showConfig" @onSubmit="configOnSubmit"/>-->
    <ConfigSpark v-model:visible="showConfig" @onSubmit="configOnSubmit"/>
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
        <template v-for="{role, userName, loading, text, time} in messagesList">
          <ChatCard :loading="loading" :role="role" :text="text" :time="time" :user-name="userName"/>
        </template>
      </div>
      <div class="inputArea">
        <InputArea_Spark
          v-model:input-value="inputValue"
          v-model:messages-list="messagesList"
          :api_config="apiConfigs"
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