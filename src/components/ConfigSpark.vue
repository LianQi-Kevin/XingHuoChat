<script setup lang="ts">
import DB from "@/tools/db";
import type {RequestChatParameters} from "@/network/SparkAPI";
import type {FormInstance, FormRules} from "element-plus";

const Spark_DB = new DB("ApiKeys", "Spark");

const display = defineModel<boolean>('visible', {required: true, default: false});

interface PropsType {
  title?: string;
  submitCallable?: () => void;
}

const props = withDefaults(defineProps<PropsType>(), {
  title: "Spark API",
});

const emit = defineEmits<{
  (e: 'onSubmit', apiConfigs: ApiConfigsType): void;
}>();

export type ApiConfigsType = RequestChatParameters & {
  // API
  APP_ID: string;
  API_Secret: string;
  API_KEY: string;
  API_Version?: string;
  API_URL?: string;
  API_Domain?: string;

  // display
  stream?: boolean
  displayModels?: boolean;
  VL?: boolean;
  langchain?: boolean;
};

const apiConfigs = reactive<ApiConfigsType>({
  // API
  APP_ID: "",
  API_Secret: "",
  API_KEY: "",
  API_Version: "V3.5",
  API_URL: "wss://spark-api.xf-yun.com/v3.5/chat",
  API_Domain: "generalv3.5",

  // Chat
  temperature: 0.5,
  max_tokens: 8192,
  top_k: 4,

  //display
  displayModels: true,
});

const ruleFormRef = ref<FormInstance>()

const rules = reactive<FormRules<ApiConfigsType>>({
  APP_ID: [{required: true, message: "APP ID is required", trigger: "blur"}],
  API_Secret: [{required: true, message: "API Secret is required", trigger: "blur"}],
  API_KEY: [{required: true, message: "API KEY is required", trigger: "blur"}],
});


const APIOptions: {value: string, label: string, APIDomain: string, APIUrl: string, disabled?: boolean}[] = [
  { value: 'V1.5', label: 'Version 1.5', APIDomain: "general", APIUrl: "wss://spark-api.xf-yun.com/v1.1/chat" },
  { value: 'V2.0', label: 'Version 2.0', APIDomain: "generalv2", APIUrl: "wss://spark-api.xf-yun.com/v2.1/chat", disabled: true },
  { value: 'V3.0', label: 'Version 3.0', APIDomain: "generalv3", APIUrl: "wss://spark-api.xf-yun.com/v3.1/chat" },
  { value: 'V3.5', label: 'Version 3.5', APIDomain: "generalv3.5", APIUrl: "wss://spark-api.xf-yun.com/v3.5/chat" },
  { value: 'Custom', label: 'Custom', APIDomain: "", APIUrl: "", disabled: true },
];

async function beforeClose(formEl: FormInstance | undefined) {
  if (!formEl) return // 非空
  // verify the API_URL
  await formEl.validate(async (valid, _) => {
    if (valid) {
      await Spark_DB.setItem("apiConfigs", toRaw(apiConfigs));
      display.value = false;
      // 保存时回调
      emit("onSubmit", toRaw(apiConfigs));
      return
    } else {
      ElMessage.error("API verify failed, please check the required fields")
    }
  })
}

// 在 APIVersion select 修改时更新 APIDomain 和 APIUrl
function updateAPI(value: any) {
  const api = APIOptions.find(item => item.value === value)
  if (!api) return
  if (api.value !== "Custom") {
    apiConfigs.API_Domain = api.APIDomain
    apiConfigs.API_URL = api.APIUrl
  } else {
    collapseRef.value = "1"
  }
}

onMounted(() => {
  nextTick(() => {
    // 检查数据库内是否存在已保存数据，更新全局变量
    Spark_DB.getItem("apiConfigs").then((res) => {
      if (res) {
        Object.assign(apiConfigs, res);
      }
    });
  });
});
// refs
const collapseRef = ref<string>('');
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
    <el-form
      ref="ruleFormRef"
      :rules="rules"
      :model="apiConfigs"
      label-width="100px"
      label-position="left"
      status-icon
    >
      <el-form-item label="APP ID" prop="APP_ID">
        <el-input v-model="apiConfigs.APP_ID" placeholder="Enter your App ID" clearable />
      </el-form-item>
      <el-form-item label="API Key" prop="API_KEY">
        <el-input v-model="apiConfigs.API_KEY" placeholder="Enter your App Key" clearable />
      </el-form-item>
      <el-form-item label="API Secret" prop="API_Secret">
        <el-input v-model="apiConfigs.API_Secret" placeholder="Enter your API Secret" clearable />
      </el-form-item>
      <el-form-item label="API Version" prop="API_Version">
        <el-select v-model="apiConfigs.API_Version" placeholder="Select" @change="updateAPI" filterable >
          <el-option v-for="item in APIOptions" :key="item.label" :label="item.label" :value="item.value" :disabled="item.disabled"/>
        </el-select>
      </el-form-item>
      <el-collapse accordion :model-value="collapseRef">
        <el-collapse-item name="1" title="Advanced Configurations" >
          <el-form-item label="API Domain" prop="API_Domain">
            <el-input v-model="apiConfigs.API_Domain" placeholder="Enter your App Key" clearable :disabled="apiConfigs.API_Version!=='Custom'" />
          </el-form-item>
          <el-form-item label="API URL" prop="API_URL">
            <el-input v-model="apiConfigs.API_URL" placeholder="Enter your App Key" clearable :disabled="apiConfigs.API_Version!=='Custom'" />
          </el-form-item>
          <el-form-item label="Max Tokens" prop="max_tokens">
            <el-slider v-model.number="apiConfigs.max_tokens" :max="8192" :min="1" :step="5" show-input/>
          </el-form-item>
          <el-form-item label="Temperature" prop="temperature">
            <el-slider v-model.number="apiConfigs.temperature" :max="1" :min="0" :step="0.1" show-input/>
          </el-form-item>
          <el-form-item label="Top K" prop="top_k">
            <el-slider v-model.number="apiConfigs.top_k" :max="6" :min="1" :step="1" show-input/>
          </el-form-item>
        </el-collapse-item>
        <el-collapse-item name="2" title="Page Configurations">
          <el-form-item label="Display Models" prop="displayModels" label-width="110px">
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
      <div class="dialog__link">
        <el-link href="https://console.xfyun.cn/services/cbm" target="_blank" type="info">
          Click here to application the Spark APIKeys
        </el-link>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.dialog__footer {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
}
</style>