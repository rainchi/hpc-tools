<script setup>
import { ref, onMounted } from 'vue'

const defContent = ref('Bootstrap: docker\nFrom: ubuntu:22.04\n\n%post\n    apt-get update && apt-get install -y python3\n\n%runscript\n    python3 --version\n')

const parsedSections = ref([])

const SECTION_INFO = {
  'Bootstrap': { desc: '指定建置來源類型 (如 docker, library, localimage)', unique: true, isHeader: true },
  'From': { desc: '指定基礎映像檔名稱', unique: true, isHeader: true },
  '%post': { desc: '在建置過程中執行的指令 (如安裝套件、編譯程式)', unique: false },
  '%environment': { desc: '設定容器執行時的環境變數', unique: false },
  '%runscript': { desc: '定義容器啟動時預設執行的指令', unique: true },
  '%files': { desc: '將檔案從宿主機複製到容器內', unique: false },
  '%labels': { desc: '為容器添加元數據標籤 (Key-Value)', unique: false },
  '%help': { desc: '定義容器的說明文件，可用 apptainer help 查看', unique: true },
  '%setup': { desc: '在建置開始前，於宿主機上執行的指令', unique: false },
  '%test': { desc: '建置完成後執行的測試指令', unique: false },
  '%startscript': { desc: '當容器以 instance start 啟動時執行的指令', unique: true }
}

// Parser function
const parseDef = (content) => {
  const lines = content.split('\n')
  const newSections = []
  let currentSection = null

  const finalizeSection = (section) => {
      if (!section) return
      if (section.type === 'section' && section.content.length > 0) {
          // Detect common indentation
          const nonEmptyLines = section.content.filter(l => l.trim().length > 0)
          if (nonEmptyLines.length > 0) {
              // Find minimum indentation
              const minIndent = nonEmptyLines.reduce((min, line) => {
                  const match = line.match(/^(\s*)/)
                  const indent = match ? match[1].length : 0
                  return Math.min(min, indent)
              }, Infinity)

              if (minIndent > 0 && minIndent !== Infinity) {
                  section.content = section.content.map(line => {
                      if (line.length >= minIndent) {
                          return line.substring(minIndent)
                      }
                      return line.trimStart()
                  })
              }
          }
      }
      newSections.push(section)
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('%')) {
      if (currentSection) {
        finalizeSection(currentSection)
      }
      const parts = trimmed.split(/\s+/)
      const sectionName = parts[0]
      const args = parts.slice(1).join(' ')
      currentSection = {
        type: 'section',
        name: sectionName,
        args: args,
        content: []
      }
    } else {
      if (currentSection) {
        currentSection.content.push(line)
      } else {
        // Header
        if (trimmed.includes(':')) {
          const splitIndex = line.indexOf(':')
          const key = line.substring(0, splitIndex).trim()
          const value = line.substring(splitIndex + 1).trim()
          newSections.push({
            type: 'header',
            key: key,
            value: value
          })
        }
      }
    }
  }
  if (currentSection) {
    finalizeSection(currentSection)
  }
  parsedSections.value = newSections
}

// Generator function
const generateDef = () => {
  let content = ''
  for (const section of parsedSections.value) {
    if (section.type === 'header') {
      content += `${section.key}: ${section.value}\n`
    } else if (section.type === 'section') {
      content += `\n${section.name} ${section.args || ''}\n`
      content += section.content.map(line => line.trim() === '' ? '' : '    ' + line).join('\n') + '\n'
    }
  }
  defContent.value = content
}

// Initial parse
onMounted(() => {
    parseDef(defContent.value)
})

const isSectionExists = (name) => {
    return parsedSections.value.some(s => 
        (s.type === 'header' && s.key === name) || 
        (s.type === 'section' && s.name === name)
    )
}

const addHeader = (key = 'Bootstrap', value = 'docker') => {
    if (SECTION_INFO[key]?.unique && isSectionExists(key)) return
    parsedSections.value.unshift({ type: 'header', key: key, value: value })
    updateContent()
}

const addSection = (name) => {
    if (SECTION_INFO[name]?.unique && isSectionExists(name)) return
    parsedSections.value.push({ type: 'section', name: name, args: '', content: [''] })
    updateContent()
}

const removeSection = (index) => {
    parsedSections.value.splice(index, 1)
    updateContent()
}

const updateContent = () => {
    generateDef()
}

const updateSectionContent = (index, newContent) => {
    parsedSections.value[index].content = newContent.split('\n')
    updateContent()
}

const handleTab = (e) => {
    // Try using execCommand first to preserve undo history
    if (document.execCommand('insertText', false, '    ')) {
        return
    }

    const target = e.target
    const start = target.selectionStart
    const end = target.selectionEnd
    const value = target.value

    // Insert 4 spaces
    target.value = value.substring(0, start) + '    ' + value.substring(end)

    // Put cursor back
    target.selectionStart = target.selectionEnd = start + 4

    // Trigger input event to update v-model or @input handlers
    target.dispatchEvent(new Event('input'))
}

</script>

<template>
  <div class="apptainer-builder">
    <div class="columns">
      <div class="column visual-editor">
        <h3>Visual Editor</h3>
        <div class="controls">
            <div class="control-group">
                <span class="group-label">Headers:</span>
                <button @click="addHeader('Bootstrap', 'docker')" :disabled="isSectionExists('Bootstrap')">Bootstrap</button>
                <button @click="addHeader('From', 'ubuntu:22.04')" :disabled="isSectionExists('From')">From</button>
                <button @click="addHeader('', '')">Custom Header</button>
            </div>
            <div class="control-group">
                <span class="group-label">Sections:</span>
                <button @click="addSection('%post')">%post</button>
                <button @click="addSection('%environment')">%environment</button>
                <button @click="addSection('%runscript')" :disabled="isSectionExists('%runscript')">%runscript</button>
                <button @click="addSection('%files')">%files</button>
                <button @click="addSection('%labels')">%labels</button>
                <button @click="addSection('%help')" :disabled="isSectionExists('%help')">%help</button>
                <button @click="addSection('%test')">%test</button>
                <button @click="addSection('%setup')">%setup</button>
            </div>
        </div>

        <div class="sections-list">
            <div v-for="(section, index) in parsedSections" :key="index" class="section-item">
                <div v-if="section.type === 'header'" class="header-item">
                    <div class="item-main">
                        <div class="input-row">
                            <input v-model="section.key" @input="updateContent" placeholder="Key" class="input-key" />
                            <span class="separator">:</span>
                            <input v-model="section.value" @input="updateContent" placeholder="Value" class="input-value" />
                            <button class="btn-remove" @click="removeSection(index)">×</button>
                        </div>
                        <div v-if="SECTION_INFO[section.key]" class="section-desc">
                            {{ SECTION_INFO[section.key].desc }}
                        </div>
                    </div>
                </div>
                <div v-else class="block-item">
                    <div class="block-header">
                        <div class="block-title">
                            <span class="block-name">{{ section.name }}</span>
                            <input v-model="section.args" @input="updateContent" placeholder="Args" class="input-args" />
                        </div>
                        <button class="btn-remove" @click="removeSection(index)">×</button>
                    </div>
                    <div v-if="SECTION_INFO[section.name]" class="section-desc">
                        {{ SECTION_INFO[section.name].desc }}
                    </div>
                    <textarea
                        :value="section.content.join('\n')"
                        @input="e => updateSectionContent(index, e.target.value)"
                        @keydown.tab.prevent="handleTab"
                        rows="5"
                        class="block-content"
                    ></textarea>
                </div>
            </div>
        </div>
      </div>

      <div class="column text-editor">
        <h3>Definition File</h3>
        <textarea
            v-model="defContent"
            @input="e => parseDef(e.target.value)"
            @keydown.tab.prevent="handleTab"
            class="full-editor"
            spellcheck="false"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<style scoped>
.apptainer-builder {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    background-color: var(--color-background);
    color: var(--color-text);
}
.columns {
    display: flex;
    gap: 20px;
    height: 100%;
}

@media (max-width: 768px) {
    .columns {
        flex-direction: column;
        height: auto;
    }
    .column {
        height: 400px; /* Give some height to the editor and list on mobile */
    }
}
.column {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
h3 {
    margin-bottom: 10px;
    color: var(--color-heading);
}
.full-editor {
    flex: 1;
    font-family: monospace;
    padding: 10px;
    background: var(--color-background-soft);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    resize: none;
    font-size: 14px;
}
.sections-list {
    flex: 1;
    overflow-y: auto;
    padding-right: 10px;
}
.section-item {
    background: var(--color-background-soft);
    margin-bottom: 12px;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    transition: border-color 0.2s;
}
.section-item:hover {
    border-color: var(--color-border-hover);
}
.header-item {
    display: flex;
    flex-direction: column;
}
.item-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.input-row {
    display: flex;
    gap: 10px;
    align-items: center;
}
.section-desc {
    font-size: 0.75rem;
    color: #8b949e;
    margin-bottom: 8px;
    font-style: italic;
}
.block-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
}
.block-title {
    display: flex;
    gap: 10px;
    align-items: center;
    flex: 1;
}
.block-name {
    color: #42b883;
    font-weight: bold;
    font-family: monospace;
    font-size: 1.1rem;
}
.input-args {
    flex: 1;
    max-width: 300px;
}
.block-content {
    width: 100%;
    background: var(--color-background);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    padding: 8px;
    font-size: 0.9rem;
    line-height: 1.4;
}
.controls {
    margin-bottom: 15px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.control-group {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    align-items: center;
}
.group-label {
    font-size: 0.85rem;
    font-weight: bold;
    color: var(--color-text);
    margin-right: 5px;
    min-width: 70px;
}
button {
    cursor: pointer;
    padding: 4px 8px;
    background: var(--color-background-mute);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    transition: all 0.2s;
    font-size: 0.85rem;
}
button:hover:not(:disabled) {
    background: var(--color-border-hover);
    border-color: #42b883;
}
button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: grayscale(1);
}
.btn-remove {
    background: transparent;
    border: none;
    color: #ff4d4f;
    font-size: 1.2rem;
    padding: 0 5px;
    line-height: 1;
}
.btn-remove:hover {
    background: rgba(255, 77, 79, 0.1);
    border-radius: 4px;
}
input {
    background: var(--color-background);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.9rem;
}
input:focus {
    outline: none;
    border-color: #42b883;
}
.input-key {
    width: 120px;
    font-weight: bold;
}
.input-value {
    flex: 1;
}
.separator {
    color: var(--color-text);
    font-weight: bold;
}
</style>

