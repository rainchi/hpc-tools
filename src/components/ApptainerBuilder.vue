<script setup>
import { ref, onMounted } from 'vue'

const defContent = ref('Bootstrap: docker\nFrom: ubuntu:22.04\n\n%post\n    apt-get update && apt-get install -y python3\n\n%runscript\n    python3 --version\n')

const parsedSections = ref([])

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

const addHeader = () => {
    parsedSections.value.unshift({ type: 'header', key: 'Bootstrap', value: 'docker' })
    updateContent()
}

const addSection = (name) => {
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
            <button @click="addHeader">Add Header</button>
            <button @click="addSection('%post')">Add %post</button>
            <button @click="addSection('%environment')">Add %environment</button>
            <button @click="addSection('%runscript')">Add %runscript</button>
            <button @click="addSection('%files')">Add %files</button>
             <button @click="addSection('%labels')">Add %labels</button>
             <button @click="addSection('%help')">Add %help</button>
        </div>

        <div class="sections-list">
            <div v-for="(section, index) in parsedSections" :key="index" class="section-item">
                <div v-if="section.type === 'header'" class="header-item">
                    <input v-model="section.key" @input="updateContent" placeholder="Key" class="input-key" />
                    <span class="separator">:</span>
                    <input v-model="section.value" @input="updateContent" placeholder="Value" class="input-value" />
                    <button class="btn-remove" @click="removeSection(index)">×</button>
                </div>
                <div v-else class="block-item">
                    <div class="block-header">
                        <span class="block-name">{{ section.name }}</span>
                        <input v-model="section.args" @input="updateContent" placeholder="Args" class="input-args" />
                        <button class="btn-remove" @click="removeSection(index)">×</button>
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
    margin-bottom: 10px;
    padding: 10px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
}
.header-item {
    display: flex;
    gap: 10px;
    align-items: center;
}
.block-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
    font-weight: bold;
}
.block-name {
    color: #42b883; /* Vue green or similar */
}
.block-content {
    width: 100%;
    background: var(--color-background);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    font-family: monospace;
    padding: 5px;
}
.controls {
    margin-bottom: 10px;
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
}
button {
    cursor: pointer;
    padding: 5px 10px;
    background: var(--color-border);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    transition: background 0.2s;
}
button:hover {
    background: var(--color-border-hover);
}
.btn-remove {
    background: transparent;
    border: none;
    color: #ff4d4f;
    font-size: 1.2em;
    padding: 0 5px;
}
.btn-remove:hover {
    background: rgba(255, 77, 79, 0.1);
}
input {
    background: var(--color-background);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    padding: 4px;
    border-radius: 3px;
}
.input-key {
    width: 120px;
}
.input-value {
    flex: 1;
}
.input-args {
    flex: 1;
    margin-left: 10px;
    margin-right: 10px;
}
.separator {
    font-weight: bold;
}
</style>

