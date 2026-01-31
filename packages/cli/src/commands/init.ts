// packages/cli/src/commands/init.ts

import fs from 'fs';
import path from 'path';

const SCHEMA_TEMPLATE = `# Buried Point Schema Definition
# This file defines the events that can be tracked in your application

version: "1.0"

events:
  # Page view event (automatically tracked)
  - name: page_view
    description: Page view event
    type: page_view
    module: Global
    properties:
      - name: url
        type: string
        required: true
        description: Page URL
      - name: title
        type: string
        required: false
        description: Page title

  # Example: Button click event
  - name: button_click
    description: Button click event
    type: click
    module: Common
    owner: Developer
    properties:
      - name: button_id
        type: string
        required: true
        description: Button unique identifier
      - name: button_text
        type: string
        required: false
        description: Button text content

  # Example: Product exposure event
  - name: product_expose
    description: Product exposure in list
    type: expose
    module: Product
    properties:
      - name: product_id
        type: string
        required: true
        description: Product ID
      - name: position
        type: number
        required: false
        description: Position in list

  # Add more events below...
`;

const CONFIG_TEMPLATE = `{
  "serverUrl": "http://localhost:1024/track",
  "appId": "my-app",
  "appVersion": "1.0.0",
  "debug": true,
  "batchSize": 10,
  "flushInterval": 5000
}
`;

export async function init(dir: string = '.'): Promise<void> {
  const targetDir = path.resolve(dir);

  console.log(`Initializing buried-point in ${targetDir}...`);

  // Create schema file
  const schemaPath = path.join(targetDir, 'track-schema.yaml');
  if (!fs.existsSync(schemaPath)) {
    fs.writeFileSync(schemaPath, SCHEMA_TEMPLATE);
    console.log(`  Created: track-schema.yaml`);
  } else {
    console.log(`  Skipped: track-schema.yaml (already exists)`);
  }

  // Create config file
  const configPath = path.join(targetDir, 'track-config.json');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, CONFIG_TEMPLATE);
    console.log(`  Created: track-config.json`);
  } else {
    console.log(`  Skipped: track-config.json (already exists)`);
  }

  // Create data directory
  const dataDir = path.join(targetDir, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`  Created: data/`);
  }

  console.log(`\nDone! Next steps:`);
  console.log(`  1. Edit track-schema.yaml to define your events`);
  console.log(`  2. Run: bp serve`);
  console.log(`  3. Integrate SDK in your application`);
}
