<!--suppress ALL -->
<script setup>
import md from '@/tools/markdown'
import "github-markdown-css/github-markdown.css";
import CodeCard from '@/components/CodeCard.vue'
import {useClipboard, useThrottleFn} from '@vueuse/core'
import { CopyDocument, Edit } from "@element-plus/icons-vue";

const props = defineProps({
  content: {
    required: true,
    type: String
  },
  role: {
    required: false,
    type: String,
    default: 'assistant',
    validator(value) {
      // The value must match one of these strings
      return ['assistant', 'user', 'system'].includes(value)
    }
  }
});

const codeBlocksContainer = ref(null);

onMounted(() => {
  // 确保 markdown-it 渲染的内容已经插入 DOM
  nextTick(() => {
    throttledReplaceCodeCard()
  });
});

function replaceCodeCard() {
  const codeBlocks = codeBlocksContainer.value.querySelectorAll('pre[id="codeSpace"]');

  codeBlocks.forEach(block => {
    const code = block.querySelector('code[class*="language-"]');
    if (code) {
      const content = code.textContent;
      // 使用默认值 'plaintext' 如果没有找到语言类
      const lang = code.className.replace('language-', '') || 'plaintext';

      // 创建 CodeCard 实例并替换当前的 pre 元素
      // 传递 lang, content, 以及 theme (如果需要的话)
      const codeCardInstance = createApp(CodeCard, { lang, content });
      const mountNode = document.createElement('div');
      block.replaceWith(mountNode);
      codeCardInstance.mount(mountNode);
    }
  });
}

const throttledReplaceCodeCard = useThrottleFn(replaceCodeCard, 500);

const { text, copy, copied, isSupported } = useClipboard()

function copyContent() {
  if (isSupported) {
    if (props.content.length === 0) {
      ElMessage({
        message: 'Nothing to copy',
        type: 'warning'
      })
    } else {
      copy(props.content)
      if(copied){
        console.debug(`Copied to clipboard: ${props.content}`)
      }
    }
  } else {
    ElMessage({
      message: 'Your browser does not support copying',
      type: 'error'
    })
  }
}
</script>

<template>
  <div style="gap: 0.75rem; flex-direction: column; box-sizing: border-box; display: block">
    <div class="flexBox">
      <article class="markdown-body" ref="codeBlocksContainer">
        <div class="markdown" v-if="props.role == 'user'">{{props.content}}</div>
        <div v-html="md.render(props.content)" class="markdown" v-else/>
      </article>
      <div class="markdown__Tools">
        <el-button class="markdown__Copy" link @click="copyContent()">
          <el-icon><CopyDocument /></el-icon>
        </el-button>
        <el-button class="markdown__Change" link v-if="false && props.role === 'user'">
          <el-icon><Edit style="width: 14px; height: 14px"/></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.flexBox{
  max-width: 100%;
  box-sizing: border-box;

  .markdown-body {
    width: auto;
    word-wrap: break-word;
    gap: 0.5rem;
    align-items: start;
    min-height: 20px;
    flex-direction: column;
    display: flex;

    box-sizing: border-box;

    background: 0;
    color: var(--el-text-color);

    .markdown {
      width: 100%;
      max-width: none;
      word-wrap: break-word;
    }
  }
  .markdown__Tools {
    svg {
      display: none;
    }
  }
}
.flexBox:hover, .flexBox:active {
  svg {
    display: block;
  }
}
</style>
