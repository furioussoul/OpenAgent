import { anthropic } from 'mycto_agent'

const agent = anthropic('你的API Key')

const result = await agent.chat('帮我在当前目录创建一个hello.txt文件，内容写上 Hello World')

console.log(result.text)
console.log(result.toolCalls) // 看看它调用了什么工具