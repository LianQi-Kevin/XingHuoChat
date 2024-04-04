<script setup lang="ts">
import {ApiConfigsType} from "@/components/ConfigSpark.vue";
import {TTSRecorder} from "@/network/SparkAPI";
import router from "@/router";
import DB from "@/tools/db";

const Messages = ref<string>("");

async function SparkTest() {
  console.debug("Start SparkTest")
  // load apiConfigs
  const SparkAPI_DB = new DB("ApiKeys", "Spark");
  const apiConfigs = await SparkAPI_DB.getItem("apiConfigs") as ApiConfigsType

  // create TTSRecorder
  const tts = new TTSRecorder(
    apiConfigs.APP_ID,
    apiConfigs.API_Secret,
    apiConfigs.API_KEY,
  )
  tts.onMessage = (message: string) => {
    console.debug("Response message: ", message)
    Messages.value += message
  }

  tts.onFinish = (totalResult: string) => {
    console.debug("Total response: ", totalResult)
  }

  tts.connectWebSocket([
    {role: "system", content: "Your are a helpful assistant."},
    {role: "user", content: "使用中文向我介绍你自己"},
    // {role: "assistant", content: "您好，我是科大讯飞研发的认知智能大模型，我的名字叫讯飞星火认知大模型。"},
    // {role: "user", content: "你能做什么？"},
  ], apiConfigs.API_URL)
}

// todo: 请求日志写入本地

</script>

<template>
  <div class="content">
    <div style="font-size: 20px; min-height: 150px" class="header">DEVELOPER CENTER</div>
    <el-button-group>
      <el-button @click="SparkTest">TEST SPARK API</el-button>
    </el-button-group>
    <el-button-group>
      <el-button @click="router.push('/home')">GO HOME_OPENAI</el-button>
      <el-button @click="router.push('/home_Spark')">GO HOME_Spark</el-button>
    </el-button-group>

    <div class="MessageBox">{{Messages}}</div>
  </div>
</template>

<style scoped lang="scss">
.content {
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: center;

  width: 100vw;
  height: 100vh;

  gap: 5px;
  padding: 10px;

}
</style>