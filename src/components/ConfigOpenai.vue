<script lang="ts" setup>
import DB from "@/tools/db";
import type {openaiChatCompletionRequestParams} from "@/types/OpenaiAPI";
import type {FormInstance, FormRules} from "element-plus";
import {listModels} from "@/network/OpenaiApi";

const OpenaiAPI_DB = new DB("ApiKeys", "Openai");

const display = defineModel('visible', {type: Boolean});

interface PropsType {
  title?: string,
  submitCallable?: Function,
}

const props = withDefaults(defineProps<PropsType>(), {
  title: "OpenAI API",
});

const emit = defineEmits<{
  (e: 'onSubmit', apiConfigs: ApiConfigsType): void;
}>();

export type ApiConfigsType = Omit<openaiChatCompletionRequestParams,
  "logprobs" | "n" | "seed" | "stop" | "user" | "presence_penalty" | "frequency_penalty"> & {
  API_URL: string;
  API_KEY?: string;
  displayModels?: boolean;
  VL?: boolean;
  langchain?: boolean;
};


const apiConfigs = reactive<ApiConfigsType>({
  API_URL: "",
  API_KEY: "EMPTY",
  max_tokens: 500,
  temperature: 0.7,
  top_p: 1,
  stream: true,
  VL: false,
  langchain: false,
  displayModels: true,
});

const ruleFormRef = ref<FormInstance>()

const rules = reactive<FormRules<ApiConfigsType>>({
  API_URL: [{required: true, message: "API URL is required", trigger: "blur"}],
  API_KEY: [{required: true, message: "API KEY is required", trigger: "blur"}],
});


async function beforeClose(formEl: FormInstance | undefined) {
  if (!formEl) return // 非空
  // verify the API_URL
  try {
    const data = await listModels(apiConfigs.API_URL)
    if (data.data[0]?.config) {
      apiConfigs.stream = data.data[0]?.config?.stream;
      apiConfigs.VL = data.data[0]?.config?.VL;
      apiConfigs.langchain = data.data[0]?.config?.langchain;
    } else {
      apiConfigs.stream = true;
      apiConfigs.VL = false;
      apiConfigs.langchain = false;
    }
    ElMessage.success(`API verify Pass, Get model: ${data.data.map(model => model.id)[0]}`);
    await OpenaiAPI_DB.setItem("apiConfigs", toRaw(apiConfigs));
    display.value = false;

    // 保存时回调
    emit("onSubmit", toRaw(apiConfigs));
  } catch (err) {
    if (!ruleFormRef.value) return // 非空
    if (err instanceof TypeError) {
      ruleFormRef.value.validateField("API_URL", () => {
        ElMessage.error("Please type the API URL & API KEY");
      });
    } else {
      ElMessage.error("API verify failed, please check the API URL & API KEY")
    }
  }
}


onMounted(() => {
  nextTick(() => {
    // 检查数据库内是否存在已保存数据，更新全局变量
    OpenaiAPI_DB.getItem("apiConfigs").then((res) => {
      if (res) {
        Object.assign(apiConfigs, res);
      }
    });
  });
});

</script>

<template>
  <el-dialog
    :before-close="beforeClose"
    :model-value="display"
    :title="props.title"
    align-center
    width="70%"
    :destroy-on-clos="true"
    :close-delay="3"
  >
    <el-form :model="apiConfigs" label-position="left" label-width="auto" status-icon :rules="rules" ref="ruleFormRef">
      <el-form-item label="API Url" label-width="75px" prop="API_URL">
        <el-input v-model="apiConfigs.API_URL" clearable placeholder="API URL">
          <template #append>/v1</template>
        </el-input>
      </el-form-item>
      <el-form-item label="API Key" label-width="75px" prop="API_KEY">
        <el-input v-model="apiConfigs.API_KEY" clearable placeholder="API KEY"/>
      </el-form-item>
      <el-collapse>
        <el-collapse-item name="1" title="Advanced Configurations" >
          <el-form-item label="Max Tokens" prop="max_tokens">
            <el-slider v-model.number="apiConfigs.max_tokens" :max="2048" :min="1" :step="5" show-input/>
          </el-form-item>
          <el-form-item label="Temperature" prop="temperature">
            <el-slider v-model.number="apiConfigs.temperature" :max="2" :min="0" :step="0.1" show-input/>
          </el-form-item>
          <el-form-item label="Top P" prop="top_p">
            <el-slider v-model.number="apiConfigs.top_p" :max="1" :min="0" :step="0.1" show-input/>
          </el-form-item>
          <el-form-item label="Stream Chat" prop="stream">
            <el-switch v-model.number="apiConfigs.stream" />
          </el-form-item>
        </el-collapse-item>
        <el-collapse-item name="2" title="Page Configurations">
          <el-form-item label="Display Models" prop="displayModels">
            <el-switch v-model.number="apiConfigs.displayModels" />
          </el-form-item>
        </el-collapse-item>
      </el-collapse>
    </el-form>

    <template #footer>
      <div class="dialog__footer">
        <el-button plain @click="display = false">Cancel</el-button>
        <el-button plain type="primary" @click="beforeClose(ruleFormRef)">Save</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.dialog__footer {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
}
</style>