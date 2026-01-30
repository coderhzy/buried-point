// packages/cli/src/commands/docs.ts

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

interface PropertySchema {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

interface EventSchema {
  name: string;
  description?: string;
  type: string;
  module?: string;
  owner?: string;
  properties: PropertySchema[];
}

interface SchemaConfig {
  version: string;
  events: EventSchema[];
}

export async function generateDocs(
  schemaPath: string,
  outputPath: string
): Promise<void> {
  // Read schema file
  if (!fs.existsSync(schemaPath)) {
    console.error(`Schema file not found: ${schemaPath}`);
    process.exit(1);
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const schema = yaml.parse(schemaContent) as SchemaConfig;

  // Generate markdown
  let markdown = `# 埋点文档\n\n`;
  markdown += `> 自动生成于 ${new Date().toLocaleString()}\n\n`;
  markdown += `Schema 版本: ${schema.version}\n\n`;

  // Group events by module
  const eventsByModule = new Map<string, EventSchema[]>();
  for (const event of schema.events) {
    const module = event.module ?? 'Other';
    if (!eventsByModule.has(module)) {
      eventsByModule.set(module, []);
    }
    eventsByModule.get(module)!.push(event);
  }

  // Table of contents
  markdown += `## 目录\n\n`;
  for (const [module, events] of eventsByModule) {
    markdown += `- [${module}](#${module.toLowerCase().replace(/\s+/g, '-')})\n`;
    for (const event of events) {
      markdown += `  - [${event.name}](#${event.name.toLowerCase().replace(/_/g, '-')})\n`;
    }
  }
  markdown += `\n---\n\n`;

  // Event details
  for (const [module, events] of eventsByModule) {
    markdown += `## ${module}\n\n`;

    for (const event of events) {
      markdown += `### ${event.name}\n\n`;

      if (event.description) {
        markdown += `${event.description}\n\n`;
      }

      markdown += `| 属性 | 值 |\n`;
      markdown += `|------|----|\n`;
      markdown += `| 事件类型 | \`${event.type}\` |\n`;
      if (event.module) {
        markdown += `| 所属模块 | ${event.module} |\n`;
      }
      if (event.owner) {
        markdown += `| 负责人 | ${event.owner} |\n`;
      }
      markdown += `\n`;

      if (event.properties.length > 0) {
        markdown += `#### 参数\n\n`;
        markdown += `| 参数名 | 类型 | 必填 | 说明 |\n`;
        markdown += `|--------|------|------|------|\n`;

        for (const prop of event.properties) {
          const required = prop.required ? '是' : '否';
          const description = prop.description ?? '-';
          markdown += `| ${prop.name} | \`${prop.type}\` | ${required} | ${description} |\n`;
        }
        markdown += `\n`;
      }

      // Example code
      markdown += `#### 示例代码\n\n`;
      markdown += `\`\`\`typescript\n`;
      markdown += `tracker.${event.type === 'click' ? 'click' : event.type === 'expose' ? 'expose' : 'track'}('${event.name}', {\n`;
      for (const prop of event.properties) {
        const exampleValue = getExampleValue(prop.type);
        markdown += `  ${prop.name}: ${exampleValue},\n`;
      }
      markdown += `});\n`;
      markdown += `\`\`\`\n\n`;

      markdown += `---\n\n`;
    }
  }

  // Write output
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, markdown);
  console.log(`Documentation generated: ${outputPath}`);
}

function getExampleValue(type: string): string {
  switch (type) {
    case 'string':
      return `'example'`;
    case 'number':
      return '123';
    case 'boolean':
      return 'true';
    case 'object':
      return '{}';
    case 'array':
      return '[]';
    default:
      return `'value'`;
  }
}
